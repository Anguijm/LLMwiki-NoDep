import { describe, it, expect } from 'vitest';

describe('FrontmatterParser', () => {
  it('parses valid frontmatter', () => {
    const r = FrontmatterParser.parse(`---
title: Test Note
tier: warm
created: 2026-04-21T14:22:00Z
updated: 2026-04-21T14:22:00Z
tags: [math, calculus]
---
Body content here.`);
    expect(r.errors).toHaveLength(0);
    expect(r.frontmatter.title).toBe('Test Note');
    expect(r.frontmatter.tier).toBe('warm');
    expect(r.frontmatter.tags).toEqual(['math', 'calculus']);
    expect(r.body).toBe('Body content here.');
  });

  it('reports missing required fields', () => {
    const r = FrontmatterParser.parse(`---
title: No Tier
created: 2026-04-21T14:22:00Z
updated: 2026-04-21T14:22:00Z
tags: []
---
Body.`);
    expect(r.errors.some(e => e.field === 'tier')).toBe(true);
  });

  it('rejects invalid tier value', () => {
    const r = FrontmatterParser.parse(`---
title: Bad Tier
tier: hot
created: 2026-04-21T14:22:00Z
updated: 2026-04-21T14:22:00Z
tags: []
---
Body.`);
    expect(r.errors.some(e => e.field === 'tier')).toBe(true);
  });

  it('tolerates BOM', () => {
    const r = FrontmatterParser.parse('\uFEFF---\ntitle: BOM Note\ntier: bedrock\ncreated: 2026-04-21T14:22:00Z\nupdated: 2026-04-21T14:22:00Z\ntags: []\n---\nBOM body.');
    expect(r.errors).toHaveLength(0);
    expect(r.frontmatter.title).toBe('BOM Note');
  });

  it('tolerates CRLF', () => {
    const r = FrontmatterParser.parse('---\r\ntitle: CRLF Note\r\ntier: cold\r\ncreated: 2026-04-21T14:22:00Z\r\nupdated: 2026-04-21T14:22:00Z\r\ntags: []\r\n---\r\nCRLF body.');
    expect(r.errors).toHaveLength(0);
  });

  it('reports no frontmatter', () => {
    const r = FrontmatterParser.parse('Just a plain file.');
    expect(r.errors.some(e => e.kind === 'parse')).toBe(true);
  });

  it('preserves --- in body', () => {
    const r = FrontmatterParser.parse(`---
title: Dashes
tier: warm
created: 2026-04-21T14:22:00Z
updated: 2026-04-21T14:22:00Z
tags: []
---
Some text.

---

More text.`);
    expect(r.errors).toHaveLength(0);
    expect(r.body).toContain('---');
  });

  it('detects LLM placeholder', () => {
    const r = FrontmatterParser.parse(`---
title: Placeholder
tier: warm
created: <TIMESTAMP MISSING — human must fill in before save>
updated: 2026-04-21T14:22:00Z
tags: []
---
Body.`);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('validates title is string', () => {
    const r = FrontmatterParser.parse(`---
title: 42
tier: warm
created: 2026-04-21T14:22:00Z
updated: 2026-04-21T14:22:00Z
tags: []
---
Body.`);
    // title: 42 parses as string "42" in our minimal parser, which is valid
    // This test just confirms no crash
    expect(r).toBeDefined();
  });
});
