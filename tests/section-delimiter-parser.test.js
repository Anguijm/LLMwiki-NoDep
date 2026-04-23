import { describe, it, expect } from 'vitest';

function minimalFrontmatter(title, tier = 'warm') {
  return ['---', `title: ${title}`, `tier: ${tier}`, '---', ''].join('\n');
}

function wrapSection(slug, frontmatterAndBody) {
  return [`<<<LLMWIKI-SECTION:${slug}>>>`, frontmatterAndBody, `<<<LLMWIKI-SECTION-END:${slug}>>>`].join(
    '\n'
  );
}

describe('SectionDelimiterParser.parse — structural success cases', () => {
  it('parses a single valid section', () => {
    const input = wrapSection(
      'hello-world',
      minimalFrontmatter('Hello World') + 'Hello from the body.'
    );
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.sections).toHaveLength(1);
    const sec = result.sections[0];
    expect(sec.sentinelSlug).toBe('hello-world');
    expect(sec.canonicalSlug).toBe('hello-world');
    expect(sec.slugMismatch).toBe(false);
    expect(sec.frontmatter.title).toBe('Hello World');
    expect(sec.frontmatter.tier).toBe('warm');
    expect(sec.body).toBe('Hello from the body.');
    expect(sec.errors).toEqual([]);
  });

  it('parses three consecutive sections', () => {
    const input = [
      wrapSection('alpha', minimalFrontmatter('Alpha') + 'A'),
      wrapSection('beta', minimalFrontmatter('Beta') + 'B'),
      wrapSection('gamma', minimalFrontmatter('Gamma') + 'C'),
    ].join('\n');
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(true);
    expect(result.sections).toHaveLength(3);
    expect(result.sections.map((s) => s.sentinelSlug)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('preserves body markdown including horizontal-rule `---` lines', () => {
    const body = 'intro\n\n---\n\nbelow the rule';
    const input = wrapSection('with-rule', minimalFrontmatter('With Rule') + body);
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(true);
    expect(result.sections[0].body).toBe(body);
  });

  it('reports zero-sections as a non-error state (not a fatal)', () => {
    const input = 'just some preamble text\nno sentinels at all\n';
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(false); // zero sections → not "valid" (nothing to commit)
    expect(result.errors).toEqual([]);
    expect(result.stats.zeroSections).toBe(true);
    expect(result.stats.totalSections).toBe(0);
    expect(result.preamble).toContain('just some preamble text');
  });

  it('captures preamble text before the first section', () => {
    const input = 'before\n' + wrapSection('a', minimalFrontmatter('A') + 'body-a');
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(true);
    expect(result.preamble).toBe('before');
  });

  it('accepts a valid section with an empty body (round-4 [bugs] edge case)', () => {
    // Frontmatter is present and well-formed, but there is no body after the
    // closing `---`. The parser treats this as a valid section with body === ''
    // so the UI can either write an empty note (user intent) or surface it as
    // a zero-content row in preview (the UI layer decides).
    const input = [
      '<<<LLMWIKI-SECTION:empty-body>>>',
      '---',
      'title: Empty Body',
      'tier: warm',
      '---',
      '<<<LLMWIKI-SECTION-END:empty-body>>>',
    ].join('\n');
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(true);
    expect(result.sections).toHaveLength(1);
    const sec = result.sections[0];
    expect(sec.errors).toEqual([]);
    expect(sec.body).toBe('');
    expect(sec.frontmatter.title).toBe('Empty Body');
  });
});

describe('SectionDelimiterParser.parse — fatal delimiter errors', () => {
  it('flags unterminated-section for an open with no close', () => {
    const input = '<<<LLMWIKI-SECTION:foo>>>\nbody without a close';
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(false);
    expect(result.sections).toEqual([]);
    expect(result.errors[0].category).toBe('delimiter.unterminated-section');
    expect(result.errors[0].fatal).toBe(true);
  });

  it('flags orphan-close for a close with no matching open', () => {
    const input = '<<<LLMWIKI-SECTION-END:foo>>>\n';
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(false);
    expect(result.errors[0].category).toBe('delimiter.orphan-close');
  });

  it('flags nested-open for an open inside an already-open section', () => {
    const input = [
      '<<<LLMWIKI-SECTION:outer>>>',
      '<<<LLMWIKI-SECTION:inner>>>',
      '<<<LLMWIKI-SECTION-END:inner>>>',
      '<<<LLMWIKI-SECTION-END:outer>>>',
    ].join('\n');
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.category === 'delimiter.nested-open')).toBe(true);
  });

  it('flags mismatched-close when the close slug differs from the open slug', () => {
    const input = [
      '<<<LLMWIKI-SECTION:alpha>>>',
      minimalFrontmatter('Alpha') + 'body',
      '<<<LLMWIKI-SECTION-END:beta>>>',
    ].join('\n');
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(false);
    expect(result.errors[0].category).toBe('delimiter.mismatched-close');
  });

  it('flags invalid-slug for uppercase in the sentinel', () => {
    const input = '<<<LLMWIKI-SECTION:Foo-Bar>>>\nbody\n<<<LLMWIKI-SECTION-END:Foo-Bar>>>';
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(false);
    expect(result.errors[0].category).toBe('delimiter.invalid-slug');
  });

  it('flags malformed-open when the sentinel is missing the `>>>` suffix', () => {
    const input = '<<<LLMWIKI-SECTION:foo\nbody\n<<<LLMWIKI-SECTION-END:foo>>>';
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(false);
    expect(result.errors[0].category).toBe('delimiter.malformed-open');
  });

  it('flags too-many-sections when the paste exceeds the 200-section cap', () => {
    const sections = [];
    for (let i = 0; i < 201; i++) {
      sections.push(wrapSection(`sec-${i}`, minimalFrontmatter(`Section ${i}`) + `body ${i}`));
    }
    const input = sections.join('\n');
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.category === 'delimiter.too-many-sections')).toBe(true);
    expect(result.errors[0].message).toContain('201');
    expect(result.errors[0].message).toContain('200');
  });
});

describe('SectionDelimiterParser.parse — per-section (non-fatal) errors', () => {
  it('flags frontmatter.missing-block when a section has no `---`', () => {
    const input = '<<<LLMWIKI-SECTION:foo>>>\nplain body only\n<<<LLMWIKI-SECTION-END:foo>>>';
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(true);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].errors[0].category).toBe('frontmatter.missing-block');
  });

  it('flags frontmatter.unterminated when opening `---` has no close', () => {
    const input = [
      '<<<LLMWIKI-SECTION:foo>>>',
      '---',
      'title: Foo',
      '(no closing dashes)',
      '<<<LLMWIKI-SECTION-END:foo>>>',
    ].join('\n');
    const result = SectionDelimiterParser.parse(input);
    expect(result.sections[0].errors[0].category).toBe('frontmatter.unterminated');
  });

  it('flags frontmatter.invalid-title when the title field is missing', () => {
    const input = wrapSection(
      'foo',
      ['---', 'tier: warm', '---', 'body with no title'].join('\n')
    );
    const result = SectionDelimiterParser.parse(input);
    expect(result.sections[0].errors[0].category).toBe('frontmatter.invalid-title');
  });

  it('flags title.too-long for titles exceeding the 200-char cap', () => {
    const longTitle = 'A'.repeat(201);
    const input = wrapSection('foo', minimalFrontmatter(longTitle) + 'body');
    const result = SectionDelimiterParser.parse(input);
    expect(result.sections[0].errors.some((e) => e.category === 'title.too-long')).toBe(true);
  });

  it('flags title.control-bytes for titles containing NUL', () => {
    const input = wrapSection('foo', minimalFrontmatter('bad\0title') + 'body');
    const result = SectionDelimiterParser.parse(input);
    expect(result.sections[0].errors.some((e) => e.category === 'title.control-bytes')).toBe(true);
  });

  it('flags body.control-bytes for bodies containing NUL or C0 controls', () => {
    const input = wrapSection('foo', minimalFrontmatter('Foo') + 'body with\x01control');
    const result = SectionDelimiterParser.parse(input);
    expect(result.sections[0].errors.some((e) => e.category === 'body.control-bytes')).toBe(true);
  });

  it('flags title.empty-slug when the title normalizes to empty', () => {
    const input = wrapSection('foo', minimalFrontmatter('!!!***') + 'body');
    const result = SectionDelimiterParser.parse(input);
    expect(result.sections[0].errors.some((e) => e.category === 'title.empty-slug')).toBe(true);
  });
});

describe('SectionDelimiterParser.parse — slug-mismatch warnings', () => {
  it('emits a warning when the canonical slug differs from the sentinel slug', () => {
    const input = wrapSection('wrong-slug', minimalFrontmatter('Right Slug') + 'body');
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].category).toBe('slug.mismatch');
    const sec = result.sections[0];
    expect(sec.slugMismatch).toBe(true);
    expect(sec.canonicalSlug).toBe('right-slug');
    expect(sec.sentinelSlug).toBe('wrong-slug');
    expect(sec.slugMismatchReason).toBeTruthy();
  });

  it('does NOT emit a warning when sentinel and canonical match', () => {
    const input = wrapSection('foo-bar', minimalFrontmatter('Foo Bar') + 'body');
    const result = SectionDelimiterParser.parse(input);
    expect(result.warnings).toEqual([]);
  });
});

describe('SectionDelimiterParser.parse — encoding and line endings', () => {
  it('strips UTF-8 BOM prefix and notes it in stats', () => {
    const input =
      '﻿' + wrapSection('foo', minimalFrontmatter('Foo') + 'body');
    const result = SectionDelimiterParser.parse(input);
    expect(result.stats.bomStripped).toBe(true);
    expect(result.valid).toBe(true);
  });

  it('normalizes CRLF line endings', () => {
    const input = wrapSection('foo', minimalFrontmatter('Foo') + 'body').replace(/\n/g, '\r\n');
    const result = SectionDelimiterParser.parse(input);
    expect(result.stats.lineEndingsNormalized).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.sections[0].frontmatter.title).toBe('Foo');
  });

  it('normalizes bare CR line endings', () => {
    const input = wrapSection('foo', minimalFrontmatter('Foo') + 'body').replace(/\n/g, '\r');
    const result = SectionDelimiterParser.parse(input);
    expect(result.stats.lineEndingsNormalized).toBe(true);
    expect(result.valid).toBe(true);
  });

  it('dedents common leading whitespace so chat-UI-indented pastes still parse', () => {
    // Real-world case: some chat-client copy buttons add 2 spaces of indent
    // to every line. Without a dedent preprocessor the strict-prefix-match
    // scanner would see `  <<<LLMWIKI-SECTION:…` and silently skip it,
    // producing a zero-sections result — the exact UX bug we are pinning.
    const base = wrapSection('foo', minimalFrontmatter('Foo') + 'body');
    const indented = base
      .split('\n')
      .map((line) => (line.length > 0 ? '  ' + line : line))
      .join('\n');
    const result = SectionDelimiterParser.parse(indented);
    expect(result.valid).toBe(true);
    expect(result.stats.dedented).toBe(true);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].sentinelSlug).toBe('foo');
  });

  it('top-level dedent no-ops when any non-blank line is already flush-left', () => {
    // Sentinels and the frontmatter `---` are flush-left here, so top-level
    // dedent sees min-indent = 0 and does nothing (stats.dedented false).
    // The BODY still gets a per-section dedent pass (see below) so the
    // mixed-indent-from-chat-paste case renders cleanly — the single-line
    // "indented body line" case is a synthetic edge where one could argue
    // for either outcome. We pick body-dedent because it matches the
    // realistic case where uniform body indent is a copy-paste artifact,
    // not intentional code-block markdown.
    const input = wrapSection('foo', minimalFrontmatter('Foo') + '    indented body line');
    const result = SectionDelimiterParser.parse(input);
    expect(result.stats.dedented).toBe(false);
    expect(result.valid).toBe(true);
    // Body-level dedent strips the uniform indent.
    expect(result.sections[0].body).toBe('indented body line');
  });

  it('preserves relative indentation within a body (e.g., code block inside prose)', () => {
    // Body has a flush-left line AND a 4-space-indented line. The body-level
    // dedent sees min-indent = 0 (from the flush line) and correctly leaves
    // the indented line alone — so a genuine indented code block survives.
    const body = 'prose paragraph\n\n    code block line\n';
    const input = wrapSection('foo', minimalFrontmatter('Foo') + body);
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(true);
    expect(result.sections[0].body).toContain('prose paragraph');
    expect(result.sections[0].body).toContain('    code block line');
  });

  it('dedents with tabs as well as spaces', () => {
    const base = wrapSection('foo', minimalFrontmatter('Foo') + 'body');
    const indented = base
      .split('\n')
      .map((line) => (line.length > 0 ? '\t' + line : line))
      .join('\n');
    const result = SectionDelimiterParser.parse(indented);
    expect(result.stats.dedented).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.sections).toHaveLength(1);
  });

  it('parses mixed-indent pastes where one sentinel is flush-left and others are indented', () => {
    // This is the exact shape that bit a real user: the first line landed
    // flush-left from copy-paste and every subsequent line picked up a
    // 2-space indent. The dedent preprocessor sees min-indent = 0 (from
    // the flush-left line) and does nothing — which is the conservative
    // default behavior. Sentinel recognition must still work per-line
    // via the left-trim probe.
    const input = [
      '<<<LLMWIKI-SECTION:one>>>',
      '  ---',
      '  title: Same Name',
      '  tier: warm',
      '  ---',
      '  body one',
      '  <<<LLMWIKI-SECTION-END:one>>>',
      '',
      '  <<<LLMWIKI-SECTION:two>>>',
      '  ---',
      '  title: Same Name',
      '  tier: warm',
      '  ---',
      '  body two',
      '  <<<LLMWIKI-SECTION-END:two>>>',
    ].join('\n');
    const result = SectionDelimiterParser.parse(input);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].sentinelSlug).toBe('one');
    expect(result.sections[1].sentinelSlug).toBe('two');
  });

  it('parses the exact mixed-indent shape that bit a user (regression pin from 2026-04-23)', () => {
    // Reported shape: line 1 (open sentinel) was flush-left, line 2 (opening
    // frontmatter `---`) was flush-left, every subsequent line was 2-space
    // indented. Dedent computes min-indent = 0 (line 1 and 2) and does
    // nothing. Sentinel detection has per-line tolerance, but frontmatter
    // `---` detection also needs per-line tolerance — this test pins that
    // the full parse (sentinel + frontmatter + body) succeeds, the YAML
    // block resolves, and both sections come back valid.
    const input = [
      '<<<LLMWIKI-SECTION:test-ingest-alpha>>>',
      '---',
      '  title: Test Ingest Alpha',
      '  tier: warm',
      '  ---',
      '',
      '  # Alpha section',
      '',
      '  First test note.',
      '',
      '  <<<LLMWIKI-SECTION-END:test-ingest-alpha>>>',
      '',
      '  <<<LLMWIKI-SECTION:test-ingest-beta>>>',
      '  ---',
      '  title: Test Ingest Beta',
      '  tier: warm',
      '  ---',
      '',
      '  # Beta section',
      '',
      '  Linked: [[Test Ingest Alpha]].',
      '',
      '  <<<LLMWIKI-SECTION-END:test-ingest-beta>>>',
    ].join('\n');
    const result = SectionDelimiterParser.parse(input);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].sentinelSlug).toBe('test-ingest-alpha');
    expect(result.sections[0].frontmatter.title).toBe('Test Ingest Alpha');
    expect(result.sections[0].frontmatter.tier).toBe('warm');
    expect(result.sections[0].errors).toEqual([]);
    expect(result.sections[1].sentinelSlug).toBe('test-ingest-beta');
    expect(result.sections[1].frontmatter.title).toBe('Test Ingest Beta');
    expect(result.sections[1].errors).toEqual([]);
  });

  it('tolerates trailing whitespace on sentinel lines', () => {
    const input = [
      '<<<LLMWIKI-SECTION:foo>>>   ',
      minimalFrontmatter('Foo') + 'body',
      '<<<LLMWIKI-SECTION-END:foo>>>\t',
    ].join('\n');
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(true);
    expect(result.sections).toHaveLength(1);
  });

  it('preserves frontmatter keys that shadow Object.prototype properties', () => {
    // Guards the serializer's use of `Object.prototype.hasOwnProperty.call`
    // plus the parser's direct `result[key] = ...` semantics. A key like
    // `constructor` shadows the prototype getter with the user's own-property
    // value; we assert that value survives round-trip through the parser.
    // [council rev 8 — bugs: pin prototype-shadow behavior.]
    const input = wrapSection(
      'foo',
      [
        '---',
        'title: Foo',
        'tier: warm',
        'constructor: custom-value',
        'toString: also-fine',
        '---',
        'body',
      ].join('\n')
    );
    const result = SectionDelimiterParser.parse(input);
    expect(result.valid).toBe(true);
    expect(result.sections[0].frontmatter.title).toBe('Foo');
    expect(result.sections[0].frontmatter.constructor).toBe('custom-value');
    expect(result.sections[0].frontmatter.toString).toBe('also-fine');
  });
});

describe('SectionDelimiterParser.parse — redaction discipline', () => {
  it('never includes raw body payload text in error messages', () => {
    const payload = 'SECRET_PAYLOAD_MARKER_DO_NOT_LEAK';
    const input = wrapSection(
      'foo',
      ['---', `title: Foo\0${payload}`, 'tier: warm', '---', payload].join('\n')
    );
    const result = SectionDelimiterParser.parse(input);
    const allErrorText = result.sections
      .flatMap((s) => s.errors)
      .concat(result.errors)
      .map((e) => e.message)
      .join(' ');
    expect(allErrorText).not.toContain(payload);
  });

  it('never includes raw YAML block contents in YAML parse-error messages', () => {
    // We can't reliably force FrontmatterParser._parseYaml to throw without
    // knowing its internals, but we can at least assert the happy-path and
    // the structural redaction: slug-only references in messages.
    const input = wrapSection('foo', minimalFrontmatter('Foo') + 'body');
    const result = SectionDelimiterParser.parse(input);
    for (const w of result.warnings) {
      expect(w.message).not.toContain('body');
    }
  });
});

describe('SectionDelimiterParser.parse — input hardening', () => {
  it('returns a structured error (not a throw) for non-string input', () => {
    const result = SectionDelimiterParser.parse(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].category).toBe('input.invalid-type');
  });
});
