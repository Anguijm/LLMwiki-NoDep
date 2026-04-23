import { describe, it, expect } from 'vitest';

describe('Slugger.slugify', () => {
  it('converts a simple title to kebab-case', () => {
    expect(Slugger.slugify('Laplace Transform Pair')).toBe('laplace-transform-pair');
  });

  it('downcases with ASCII case-fold', () => {
    expect(Slugger.slugify('Foo Bar BAZ')).toBe('foo-bar-baz');
  });

  it('replaces non-alphanumerics with hyphens', () => {
    expect(Slugger.slugify("Fourier Series & Parseval's Theorem")).toBe(
      'fourier-series-parsevals-theorem'
    );
  });

  it('collapses consecutive non-slug chars into a single hyphen', () => {
    expect(Slugger.slugify('A  ---  B')).toBe('a-b');
  });

  it('strips leading and trailing hyphens', () => {
    expect(Slugger.slugify('!!hello!!')).toBe('hello');
  });

  it('strips combining marks (accents) via NFKD', () => {
    // 'é' decomposes to 'e' + U+0301 combining acute.
    expect(Slugger.slugify('Café du Monde')).toBe('cafe-du-monde');
  });

  it('returns null for titles that normalize to empty with no timestamp', () => {
    expect(Slugger.slugify('!!?*')).toBeNull();
    expect(Slugger.slugify('🤔✅')).toBeNull();
    expect(Slugger.slugify('')).toBeNull();
  });

  it('falls back to untitled-<ts> when empty and timestamp supplied', () => {
    expect(Slugger.slugify('!!?*', 1700000000)).toBe('untitled-1700000000');
  });

  it('prefixes reserved Windows names with underscore (case-insensitive)', () => {
    expect(Slugger.slugify('CON')).toBe('_con');
    expect(Slugger.slugify('con')).toBe('_con');
    expect(Slugger.slugify('Con')).toBe('_con');
    expect(Slugger.slugify('cOn')).toBe('_con');
    expect(Slugger.slugify('PRN')).toBe('_prn');
    expect(Slugger.slugify('AUX')).toBe('_aux');
    expect(Slugger.slugify('NUL')).toBe('_nul');
    expect(Slugger.slugify('COM1')).toBe('_com1');
    expect(Slugger.slugify('LPT9')).toBe('_lpt9');
  });

  it('does not prefix non-reserved names resembling reserved patterns', () => {
    expect(Slugger.slugify('console')).toBe('console');
    expect(Slugger.slugify('com10')).toBe('com10');
    expect(Slugger.slugify('lpt10')).toBe('lpt10');
  });

  it('truncates long titles at the nearest hyphen boundary within the last 20 chars', () => {
    // Spec (data_schemas.md): cut at the nearest hyphen at or before position
    // 80; fall back to hard-cut at 80 if none exists in the last 20 chars.
    // The docs example shows a more-conservative cut; our implementation picks
    // the literal "nearest prior" hyphen, which here is position 77. Both
    // satisfy the <=80-chars-at-hyphen-boundary requirement.
    const title =
      'a-very-long-title-that-goes-on-and-on-and-continues-past-the-eighty-character-limit-for-sure';
    const slug = Slugger.slugify(title);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
    expect(slug).toBe(
      'a-very-long-title-that-goes-on-and-on-and-continues-past-the-eighty-character'
    );
  });

  it('hard-cuts at 80 when no hyphen exists in the last 20 chars before the cut', () => {
    const title = 'a' + 'b'.repeat(99);
    const slug = Slugger.slugify(title);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug).toBe('a' + 'b'.repeat(79));
  });

  it('rejects non-string input', () => {
    expect(Slugger.slugify(null)).toBeNull();
    expect(Slugger.slugify(undefined)).toBeNull();
    expect(Slugger.slugify(42)).toBeNull();
  });
});

describe('Slugger.isValidSlug', () => {
  it('accepts single-word lowercase slugs', () => {
    expect(Slugger.isValidSlug('foo')).toBe(true);
    expect(Slugger.isValidSlug('abc123')).toBe(true);
  });

  it('accepts hyphen-joined kebab-case slugs', () => {
    expect(Slugger.isValidSlug('foo-bar-baz')).toBe(true);
    expect(Slugger.isValidSlug('fourier-series-parsevals-theorem')).toBe(true);
  });

  it('accepts the reserved-escape form with leading underscore', () => {
    expect(Slugger.isValidSlug('_con')).toBe(true);
    expect(Slugger.isValidSlug('_com1')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(Slugger.isValidSlug('')).toBe(false);
  });

  it('rejects uppercase', () => {
    expect(Slugger.isValidSlug('FOO')).toBe(false);
    expect(Slugger.isValidSlug('Foo-Bar')).toBe(false);
  });

  it('rejects consecutive hyphens and leading/trailing hyphens', () => {
    expect(Slugger.isValidSlug('foo--bar')).toBe(false);
    expect(Slugger.isValidSlug('-foo')).toBe(false);
    expect(Slugger.isValidSlug('foo-')).toBe(false);
  });

  it('rejects disallowed chars (underscore mid-string, dots, spaces)', () => {
    expect(Slugger.isValidSlug('foo_bar')).toBe(false);
    expect(Slugger.isValidSlug('foo.bar')).toBe(false);
    expect(Slugger.isValidSlug('foo bar')).toBe(false);
  });

  it('rejects slugs exceeding 81 chars (80 + optional underscore prefix)', () => {
    expect(Slugger.isValidSlug('a'.repeat(81))).toBe(true);
    expect(Slugger.isValidSlug('a'.repeat(82))).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(Slugger.isValidSlug(null)).toBe(false);
    expect(Slugger.isValidSlug(undefined)).toBe(false);
    expect(Slugger.isValidSlug(42)).toBe(false);
  });
});

describe('Slugger.isReservedOSName', () => {
  it('flags Windows reserved stems case-insensitively', () => {
    expect(Slugger.isReservedOSName('CON')).toBe(true);
    expect(Slugger.isReservedOSName('con')).toBe(true);
    expect(Slugger.isReservedOSName('Con')).toBe(true);
    expect(Slugger.isReservedOSName('cOn')).toBe(true);
    expect(Slugger.isReservedOSName('NUL')).toBe(true);
    expect(Slugger.isReservedOSName('COM1')).toBe(true);
    expect(Slugger.isReservedOSName('LPT9')).toBe(true);
  });

  it('flags reserved stems with extensions', () => {
    expect(Slugger.isReservedOSName('CON.md')).toBe(true);
    expect(Slugger.isReservedOSName('con.yaml')).toBe(true);
    expect(Slugger.isReservedOSName('cOn.md')).toBe(true);
    expect(Slugger.isReservedOSName('NUL.txt.md')).toBe(true);
  });

  it('flags dot and dot-dot', () => {
    expect(Slugger.isReservedOSName('.')).toBe(true);
    expect(Slugger.isReservedOSName('..')).toBe(true);
  });

  it('does not flag legitimate names that merely contain reserved substrings', () => {
    expect(Slugger.isReservedOSName('console')).toBe(false);
    expect(Slugger.isReservedOSName('aux-notes')).toBe(false);
    expect(Slugger.isReservedOSName('com10')).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(Slugger.isReservedOSName(null)).toBe(false);
    expect(Slugger.isReservedOSName(undefined)).toBe(false);
  });
});

describe('Slugger.slugMismatchReason', () => {
  it('returns null when slugs match exactly', () => {
    expect(Slugger.slugMismatchReason('foo-bar', 'foo-bar')).toBeNull();
  });

  it('flags case normalization', () => {
    expect(Slugger.slugMismatchReason('FOO-BAR', 'foo-bar')).toBe('normalized case');
  });

  it('flags non-ASCII removal', () => {
    expect(Slugger.slugMismatchReason('café', 'cafe')).toBe(
      'removed non-ASCII or special characters'
    );
  });

  it('flags length truncation', () => {
    expect(Slugger.slugMismatchReason('foo-bar-baz-qux', 'foo-bar-baz')).toBe(
      'truncated to length limit'
    );
  });

  it('falls back to generic rationale for otherwise-differing slugs', () => {
    expect(Slugger.slugMismatchReason('xyz', 'abc')).toBe('re-derived from title per canonical rules');
  });
});
