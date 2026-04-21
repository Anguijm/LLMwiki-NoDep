import { describe, it, expect } from 'vitest';

function fragmentToHTML(frag) {
  const div = document.createElement('div');
  div.appendChild(frag.cloneNode(true));
  return div.innerHTML;
}

function containsExecutableHTML(frag) {
  const html = fragmentToHTML(frag);
  return /<script/i.test(html) || /on\w+\s*=/i.test(html) || /javascript:/i.test(html) || /vbscript:/i.test(html);
}

const stubResolver = { resolve: () => null };

describe('MarkdownParser XSS', () => {
  it('escapes raw <script> tag', () => {
    const frag = MarkdownParser.parse('<script>alert("xss")</script>', stubResolver);
    expect(containsExecutableHTML(frag)).toBe(false);
  });

  it('escapes <img onerror>', () => {
    const frag = MarkdownParser.parse('<img src=x onerror=alert(1)>', stubResolver);
    const html = fragmentToHTML(frag);
    // Must not produce an actual <img> element — should be escaped text
    expect(html).not.toMatch(/<img\s/i);
  });

  it('strips javascript: URL from link href', () => {
    const frag = MarkdownParser.parse('[click](javascript:alert(1))', stubResolver);
    const html = fragmentToHTML(frag);
    // Must not produce a clickable <a> with javascript: href
    expect(html).not.toMatch(/href="javascript:/i);
    expect(html).not.toContain('<a');
  });

  it('strips mixed-case javascript: URL from href', () => {
    const frag = MarkdownParser.parse('[click](JaVaScRiPt:alert(1))', stubResolver);
    const html = fragmentToHTML(frag);
    expect(html).not.toMatch(/href="javascript:/i);
    expect(html).not.toContain('<a');
  });

  it('strips data: URL from link', () => {
    const frag = MarkdownParser.parse('[click](data:text/html,<script>alert(1)</script>)', stubResolver);
    expect(containsExecutableHTML(frag)).toBe(false);
    expect(fragmentToHTML(frag)).not.toContain('<a');
  });

  it('strips vbscript: URL from href', () => {
    const frag = MarkdownParser.parse('[click](vbscript:MsgBox("xss"))', stubResolver);
    const html = fragmentToHTML(frag);
    expect(html).not.toMatch(/href="vbscript:/i);
    expect(html).not.toContain('<a');
  });

  it('strips file:// absolute URL from href', () => {
    const frag = MarkdownParser.parse('[click](file:///etc/passwd)', stubResolver);
    const html = fragmentToHTML(frag);
    expect(html).not.toMatch(/href="file:/i);
    expect(html).not.toContain('<a');
  });

  it('escapes script in code fence', () => {
    const frag = MarkdownParser.parse('```\n<script>alert(1)</script>\n```', stubResolver);
    expect(containsExecutableHTML(frag)).toBe(false);
  });

  it('escapes script in heading', () => {
    const frag = MarkdownParser.parse('# <script>alert(1)</script>', stubResolver);
    expect(containsExecutableHTML(frag)).toBe(false);
  });
});

describe('MarkdownParser rendering', () => {
  it('renders headings', () => {
    expect(fragmentToHTML(MarkdownParser.parse('# H1', stubResolver))).toContain('<h1>');
    expect(fragmentToHTML(MarkdownParser.parse('### H3', stubResolver))).toContain('<h3>');
  });

  it('renders bold', () => {
    expect(fragmentToHTML(MarkdownParser.parse('**bold**', stubResolver))).toContain('<strong>');
  });

  it('renders italic', () => {
    expect(fragmentToHTML(MarkdownParser.parse('*italic*', stubResolver))).toContain('<em>');
  });

  it('renders inline code', () => {
    expect(fragmentToHTML(MarkdownParser.parse('`code`', stubResolver))).toContain('<code>');
  });

  it('renders code fence', () => {
    expect(fragmentToHTML(MarkdownParser.parse('```\ncode\n```', stubResolver))).toContain('<pre>');
  });

  it('renders blockquote', () => {
    expect(fragmentToHTML(MarkdownParser.parse('> quote', stubResolver))).toContain('<blockquote>');
  });

  it('renders unordered list', () => {
    expect(fragmentToHTML(MarkdownParser.parse('- item', stubResolver))).toContain('<ul>');
  });

  it('renders ordered list', () => {
    expect(fragmentToHTML(MarkdownParser.parse('1. item', stubResolver))).toContain('<ol>');
  });

  it('renders links with valid URL', () => {
    const html = fragmentToHTML(MarkdownParser.parse('[Example](https://example.com)', stubResolver));
    expect(html).toContain('<a');
    expect(html).toContain('href="https://example.com"');
  });

  it('renders horizontal rule', () => {
    expect(fragmentToHTML(MarkdownParser.parse('---', stubResolver))).toContain('<hr>');
  });

  it('renders strikethrough', () => {
    const html = fragmentToHTML(MarkdownParser.parse('~~deleted~~', stubResolver));
    expect(html).toMatch(/<del>|<s>/);
  });
});
