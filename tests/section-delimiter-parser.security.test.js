import { describe, it, expect } from 'vitest';

// Shared helpers — inspects the parsed DOM rather than the serialized HTML so
// that escaped text like `&lt;img ... onerror=alert(1)&gt;` is correctly
// recognized as inert. A text-based regex over innerHTML false-positives on
// `on\w+=` because the attribute name survives as plain text after escaping.

function hasExecutableContent(frag) {
  const div = document.createElement('div');
  div.appendChild(frag.cloneNode(true));

  // Any of these tags in the parsed DOM means an HTML-injection path is open.
  if (div.querySelector('script, iframe, object, embed, svg, link, style, meta, base, body, html')) {
    return true;
  }
  // Event-handler attributes on any surviving element.
  for (const el of div.querySelectorAll('*')) {
    for (const attr of el.attributes) {
      if (/^on/i.test(attr.name)) return true;
    }
  }
  // Dangerous URL schemes on any element that could navigate or load.
  for (const el of div.querySelectorAll('[href]')) {
    if (/^(javascript|vbscript|data):/i.test(el.getAttribute('href') || '')) return true;
  }
  for (const el of div.querySelectorAll('[src]')) {
    if (/^(javascript|vbscript|data):/i.test(el.getAttribute('src') || '')) return true;
  }
  return false;
}

const stubResolver = { resolve: () => null };

function minimalFrontmatter(title, tier = 'warm') {
  return ['---', `title: ${title}`, `tier: ${tier}`, '---', ''].join('\n');
}

function wrapSection(slug, frontmatterAndBody) {
  return [`<<<LLMWIKI-SECTION:${slug}>>>`, frontmatterAndBody, `<<<LLMWIKI-SECTION-END:${slug}>>>`].join(
    '\n'
  );
}

function collectAllMessages(result) {
  const top = (result.errors || []).map((e) => e.message);
  const perSection = (result.sections || []).flatMap((s) => (s.errors || []).map((e) => e.message));
  const warnings = (result.warnings || []).map((w) => w.message);
  return top.concat(perSection).concat(warnings);
}

// ════════════════════════════════════════════════════════
// 1. XSS payloads split across section boundaries (rev-5 security must-do)
// ════════════════════════════════════════════════════════

describe('SectionDelimiterParser + MarkdownParser — XSS payloads split across section boundaries', () => {
  // Every row below is a single raw payload. We split each payload at a
  // chosen boundary point and place the LLMWIKI sentinel pair in the split
  // so the payload straddles the parser's section boundary. After parse,
  // each section's body flows through the existing escape-by-default
  // MarkdownParser — which is the only path from ingested bytes to the DOM
  // for this feature. Asserting each body renders inert proves the rev-5
  // commitment that the boundary itself does not reassemble a payload that
  // either half alone would have been too short to execute.
  const payloads = [
    { name: 'script tag', payload: '<script>alert(1)</script>', split: 7 },
    { name: 'img onerror', payload: '<img src=x onerror=alert(1)>', split: 10 },
    { name: 'javascript: href', payload: '<a href="javascript:alert(1)">click</a>', split: 15 },
    { name: 'iframe srcdoc', payload: '<iframe src="javascript:alert(1)"></iframe>', split: 20 },
    { name: 'vbscript handler', payload: '<a href="vbscript:msgbox(1)">x</a>', split: 14 },
    { name: 'svg onload', payload: '<svg onload=alert(1)>', split: 6 },
    { name: 'body onload via event', payload: '<body onmouseover=alert(1)>', split: 8 },
  ];

  it.each(payloads)(
    'renders inert when $name payload straddles the sentinel boundary',
    ({ payload, split }) => {
      const first = payload.substring(0, split);
      const second = payload.substring(split);
      const input = [
        wrapSection('first-half', minimalFrontmatter('First') + 'pre ' + first),
        wrapSection('second-half', minimalFrontmatter('Second') + second + ' post'),
      ].join('\n');
      const result = SectionDelimiterParser.parse(input);
      expect(result.valid).toBe(true);
      expect(result.sections).toHaveLength(2);
      for (const sec of result.sections) {
        const frag = MarkdownParser.parse(sec.body, stubResolver);
        expect(hasExecutableContent(frag)).toBe(false);
      }
    }
  );

  it('renders inert even when both halves would be a complete payload inside a single section', () => {
    // Pathological case: each section ALONE contains a complete payload.
    // Not strictly "split across boundaries", but a concentrated stress case
    // that the escape-by-default parser must still defuse on both sides.
    const input = [
      wrapSection('s1', minimalFrontmatter('S1') + '<script>alert(1)</script>'),
      wrapSection('s2', minimalFrontmatter('S2') + '<img src=x onerror=alert(2)>'),
    ].join('\n');
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(true);
    for (const sec of result.sections) {
      const frag = MarkdownParser.parse(sec.body, stubResolver);
      expect(hasExecutableContent(frag)).toBe(false);
    }
  });
});

// ════════════════════════════════════════════════════════
// 2. Exhaustive error-path redaction (rev-5 security must-do)
// ════════════════════════════════════════════════════════

describe('SectionDelimiterParser — exhaustive error-path redaction', () => {
  // Every parser error category is induced with a distinctive marker string
  // placed somewhere the parser COULD leak — title, body, frontmatter, or
  // preamble — and we assert the marker never shows up in any emitted
  // error or warning message. This is the rev-5 commitment that error
  // messages carry only (a) error category, (b) validated sentinel slug,
  // and (c) line/column metadata — never raw ingested content.
  //
  // Skipped: frontmatter.yaml-parse-error. The current FrontmatterParser
  // ._parseYaml is a flat YAML subset that does not throw — unreachable
  // from this parser without changing the underlying YAML implementation.
  // Redaction discipline still holds in the code (the catch block names
  // only the error kind), but no test can induce it today.

  const MARKER = 'LEAK_MARKER_XYZ_DO_NOT_LOG_THIS_PAYLOAD_7f9c3a21';

  function assertRedacted(result) {
    const messages = collectAllMessages(result);
    for (const m of messages) {
      expect(m).not.toContain(MARKER);
    }
  }

  it('delimiter.invalid-slug does not leak the marker', () => {
    const input = [
      `<<<LLMWIKI-SECTION:Invalid-Upper-Slug>>>`,
      `preamble: ${MARKER}`,
      `<<<LLMWIKI-SECTION-END:Invalid-Upper-Slug>>>`,
    ].join('\n');
    const result = SectionDelimiterParser.parse(input);
    expect(result.errors.some((e) => e.category === 'delimiter.invalid-slug')).toBe(true);
    assertRedacted(result);
  });

  it('delimiter.malformed-open does not leak the marker', () => {
    const input = `<<<LLMWIKI-SECTION:foo\nbody line with ${MARKER}\n<<<LLMWIKI-SECTION-END:foo>>>`;
    const result = SectionDelimiterParser.parse(input);
    expect(result.errors.some((e) => e.category.startsWith('delimiter.malformed'))).toBe(true);
    assertRedacted(result);
  });

  it('delimiter.malformed-close does not leak the marker', () => {
    const input = [
      '<<<LLMWIKI-SECTION:foo>>>',
      `body line with ${MARKER}`,
      '<<<LLMWIKI-SECTION-END:foo',
    ].join('\n');
    const result = SectionDelimiterParser.parse(input);
    // Missing `>>>` means line doesn't end correctly, so it's not recognized as a close
    // and the parser reports unterminated-section instead.
    expect(
      result.errors.some((e) => e.category === 'delimiter.unterminated-section' || e.category === 'delimiter.malformed-close')
    ).toBe(true);
    assertRedacted(result);
  });

  it('delimiter.nested-open does not leak the marker', () => {
    const input = [
      '<<<LLMWIKI-SECTION:outer>>>',
      `body one with ${MARKER}`,
      '<<<LLMWIKI-SECTION:inner>>>',
      '<<<LLMWIKI-SECTION-END:inner>>>',
      '<<<LLMWIKI-SECTION-END:outer>>>',
    ].join('\n');
    const result = SectionDelimiterParser.parse(input);
    expect(result.errors.some((e) => e.category === 'delimiter.nested-open')).toBe(true);
    assertRedacted(result);
  });

  it('delimiter.orphan-close does not leak the marker', () => {
    const input = `preamble with ${MARKER}\n<<<LLMWIKI-SECTION-END:foo>>>\n`;
    const result = SectionDelimiterParser.parse(input);
    expect(result.errors.some((e) => e.category === 'delimiter.orphan-close')).toBe(true);
    assertRedacted(result);
  });

  it('delimiter.mismatched-close does not leak the marker', () => {
    const input = [
      '<<<LLMWIKI-SECTION:alpha>>>',
      minimalFrontmatter('Alpha') + `body with ${MARKER}`,
      '<<<LLMWIKI-SECTION-END:beta>>>',
    ].join('\n');
    const result = SectionDelimiterParser.parse(input);
    expect(result.errors.some((e) => e.category === 'delimiter.mismatched-close')).toBe(true);
    assertRedacted(result);
  });

  it('delimiter.unterminated-section does not leak the marker', () => {
    const input = `<<<LLMWIKI-SECTION:foo>>>\nbody with ${MARKER} and no close`;
    const result = SectionDelimiterParser.parse(input);
    expect(result.errors.some((e) => e.category === 'delimiter.unterminated-section')).toBe(true);
    assertRedacted(result);
  });

  it('delimiter.too-many-sections does not leak the marker', () => {
    const sections = [
      wrapSection('sec-0', minimalFrontmatter('First') + `body with ${MARKER}`),
    ];
    for (let i = 1; i < 201; i++) {
      sections.push(wrapSection(`sec-${i}`, minimalFrontmatter(`S${i}`) + `body ${i}`));
    }
    const result = SectionDelimiterParser.parse(sections.join('\n'));
    expect(result.errors.some((e) => e.category === 'delimiter.too-many-sections')).toBe(true);
    assertRedacted(result);
  });

  it('frontmatter.missing-block does not leak the marker', () => {
    const input = `<<<LLMWIKI-SECTION:foo>>>\nbody with ${MARKER} and no frontmatter\n<<<LLMWIKI-SECTION-END:foo>>>`;
    const result = SectionDelimiterParser.parse(input);
    const allErrors = (result.sections || []).flatMap((s) => s.errors);
    expect(allErrors.some((e) => e.category === 'frontmatter.missing-block')).toBe(true);
    assertRedacted(result);
  });

  it('frontmatter.unterminated does not leak the marker', () => {
    const input = [
      '<<<LLMWIKI-SECTION:foo>>>',
      '---',
      `title: Foo ${MARKER}`,
      '(no closing dashes)',
      '<<<LLMWIKI-SECTION-END:foo>>>',
    ].join('\n');
    const result = SectionDelimiterParser.parse(input);
    const allErrors = (result.sections || []).flatMap((s) => s.errors);
    expect(allErrors.some((e) => e.category === 'frontmatter.unterminated')).toBe(true);
    assertRedacted(result);
  });

  it('frontmatter.invalid-title does not leak the marker', () => {
    const input = wrapSection(
      'foo',
      ['---', `tier: warm`, '---', `body with ${MARKER}`].join('\n')
    );
    const result = SectionDelimiterParser.parse(input);
    const allErrors = (result.sections || []).flatMap((s) => s.errors);
    expect(allErrors.some((e) => e.category === 'frontmatter.invalid-title')).toBe(true);
    assertRedacted(result);
  });

  it('title.too-long does not leak the marker', () => {
    const paddedTitle = MARKER + 'a'.repeat(201);
    const input = wrapSection('foo', minimalFrontmatter(paddedTitle) + 'body');
    const result = SectionDelimiterParser.parse(input);
    const allErrors = (result.sections || []).flatMap((s) => s.errors);
    expect(allErrors.some((e) => e.category === 'title.too-long')).toBe(true);
    assertRedacted(result);
  });

  it('title.control-bytes does not leak the marker', () => {
    const input = wrapSection('foo', minimalFrontmatter(`${MARKER}bad title`) + 'body');
    const result = SectionDelimiterParser.parse(input);
    const allErrors = (result.sections || []).flatMap((s) => s.errors);
    expect(allErrors.some((e) => e.category === 'title.control-bytes')).toBe(true);
    assertRedacted(result);
  });

  it('body.control-bytes does not leak the marker', () => {
    const input = wrapSection('foo', minimalFrontmatter('Foo') + `${MARKER} body ctrl`);
    const result = SectionDelimiterParser.parse(input);
    const allErrors = (result.sections || []).flatMap((s) => s.errors);
    expect(allErrors.some((e) => e.category === 'body.control-bytes')).toBe(true);
    assertRedacted(result);
  });

  it('title.empty-slug does not leak the marker', () => {
    const input = wrapSection('foo', minimalFrontmatter('!!!***') + `body with ${MARKER}`);
    const result = SectionDelimiterParser.parse(input);
    const allErrors = (result.sections || []).flatMap((s) => s.errors);
    expect(allErrors.some((e) => e.category === 'title.empty-slug')).toBe(true);
    assertRedacted(result);
  });

  it('slug.mismatch warning does not leak the marker (title or body)', () => {
    const input = wrapSection(
      'wrong-slug',
      minimalFrontmatter('Right Slug') + `body with ${MARKER}`
    );
    const result = SectionDelimiterParser.parse(input);
    expect(result.warnings.some((w) => w.category === 'slug.mismatch')).toBe(true);
    assertRedacted(result);
  });

  it('input.invalid-type does not leak arbitrary input in the message', () => {
    const result = SectionDelimiterParser.parse({ toString: () => MARKER });
    expect(result.errors.some((e) => e.category === 'input.invalid-type')).toBe(true);
    assertRedacted(result);
  });
});

// ════════════════════════════════════════════════════════
// 3. Fuzz — high-density mixed XSS payloads across many sections (rev-5 nice-to-have)
// ════════════════════════════════════════════════════════

describe('SectionDelimiterParser + MarkdownParser — high-density XSS fuzz (rev-5 nice-to-have)', () => {
  it('renders every section body inert across 200 sections with mixed dense XSS payloads in bounded time', () => {
    const payloads = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '<a href="javascript:alert(1)">x</a>',
      '<svg onload=alert(1)></svg>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<body onmouseover=alert(1)>',
      '<a href="vbscript:msgbox(1)">x</a>',
      '<img src="data:text/html,<script>alert(1)</script>">',
    ];
    const sections = [];
    for (let i = 0; i < 200; i++) {
      // Each body contains ~10 mixed payloads interleaved with plain markdown.
      const body = payloads
        .concat(payloads)
        .slice(0, 10)
        .map((p, k) => `Para ${k}: ${p}\n`)
        .join('\n');
      sections.push(wrapSection(`sec-${i}`, minimalFrontmatter(`Section ${i}`) + body));
    }
    const input = sections.join('\n');
    const t0 = performance.now();
    const result = SectionDelimiterParser.parse(input);
    const parseMs = performance.now() - t0;

    expect(result.valid).toBe(true);
    expect(result.sections).toHaveLength(200);
    // 200 dense sections is comfortably under 500ms in happy-dom on a laptop;
    // a regression into seconds is a real problem worth catching.
    expect(parseMs).toBeLessThan(500);

    const t1 = performance.now();
    for (const sec of result.sections) {
      const frag = MarkdownParser.parse(sec.body, stubResolver);
      expect(hasExecutableContent(frag)).toBe(false);
    }
    const renderMs = performance.now() - t1;
    // 200 bodies × ~10 payloads each rendered through the escape path. Bound
    // is generous to avoid flaking; regressions into seconds-per-section
    // would blow right past it.
    expect(renderMs).toBeLessThan(3000);
  });
});

// ════════════════════════════════════════════════════════
// 4. Long delimiter line — ReDoS / perf proof (round-4 [bugs] edge case)
// ════════════════════════════════════════════════════════

describe('SectionDelimiterParser — oversized delimiter line performance (round-4 edge case)', () => {
  it('rejects a >1MB structurally-valid sentinel line in bounded time via length gate', () => {
    // Build a line that LOOKS like a valid sentinel (prefix + >>>) but whose
    // slug is 1MB of 'a' — far over the 81-char isValidSlug limit. The
    // length check in isValidSlug fires before the regex runs, so the
    // rejection is O(1) after the O(n) indexOf/endsWith scan. A regression
    // that swapped the length gate for regex-first would be visible here.
    const hugeSlug = 'a'.repeat(1024 * 1024);
    const input = `<<<LLMWIKI-SECTION:${hugeSlug}>>>\nbody\n<<<LLMWIKI-SECTION-END:foo>>>`;
    const t0 = performance.now();
    const result = SectionDelimiterParser.parse(input);
    const ms = performance.now() - t0;
    expect(result.valid).toBe(false);
    expect(result.errors[0].category).toBe('delimiter.invalid-slug');
    // 200ms is very generous for happy-dom + GC; a ReDoS regression would
    // push this into seconds or time out entirely.
    expect(ms).toBeLessThan(500);
  });

  it('rejects a >1MB line with lots of hyphens in bounded time (nested-quantifier stress)', () => {
    // The slug-format regex is /^_?[a-z0-9]+(-[a-z0-9]+)*$/. Even though the
    // length gate should catch this, prove the regex itself is bounded on
    // worst-case-looking inputs in case the length gate is ever removed.
    const alternating = 'a-'.repeat(500000) + 'a'; // ~1MB of 'a-a-a-a...'
    const input = `<<<LLMWIKI-SECTION:${alternating}>>>\nbody\n<<<LLMWIKI-SECTION-END:foo>>>`;
    const t0 = performance.now();
    const result = SectionDelimiterParser.parse(input);
    const ms = performance.now() - t0;
    expect(result.valid).toBe(false);
    expect(ms).toBeLessThan(500);
  });
});
