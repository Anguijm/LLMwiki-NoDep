import { describe, it, expect } from 'vitest';

describe('SRSCardParser', () => {
  it('parses valid card', () => {
    const r = SRSCardParser.parse(`---
id: 20260421-test-card
question: "What is 2+2?"
answer: "4"
ease: 2.5
interval: 0
next_review: 2026-04-22
tier: warm
---`, 'srs/20260421-test-card.yaml');
    expect(r.errors).toHaveLength(0);
    expect(r.card.id).toBe('20260421-test-card');
    expect(r.card.ease).toBe(2.5);
    expect(r.card.interval).toBe(0);
  });

  it('reports missing question', () => {
    const r = SRSCardParser.parse(`---
id: test
answer: "4"
ease: 2.5
interval: 0
next_review: 2026-04-22
tier: warm
---`, 'srs/test.yaml');
    expect(r.errors.some(e => e.field === 'question')).toBe(true);
  });

  it('reports id-filename mismatch', () => {
    const r = SRSCardParser.parse(`---
id: wrong-name
question: "Q"
answer: "A"
ease: 2.5
interval: 0
next_review: 2026-04-22
tier: warm
---`, 'srs/correct-name.yaml');
    expect(r.errors.some(e => e.field === 'id')).toBe(true);
  });

  it('rejects UTC timestamp for next_review', () => {
    const r = SRSCardParser.parse(`---
id: test
question: "Q"
answer: "A"
ease: 2.5
interval: 0
next_review: 2026-04-22T14:00:00Z
tier: warm
---`, 'srs/test.yaml');
    expect(r.errors.some(e => e.field === 'next_review')).toBe(true);
  });
});

describe('SM2Scheduler', () => {
  it('new card Good → interval 1', () => {
    const r = SM2Scheduler.compute({ ease: 2.5, interval: 0 }, 4);
    expect(r.interval).toBe(1);
  });

  it('second review Good → interval 6', () => {
    const r = SM2Scheduler.compute({ ease: 2.5, interval: 1 }, 4);
    expect(r.interval).toBe(6);
  });

  it('third review Good → interval round(6*ease)', () => {
    const r = SM2Scheduler.compute({ ease: 2.5, interval: 6 }, 4);
    expect(r.interval).toBe(15);
  });

  it('Again resets interval to 1', () => {
    const r = SM2Scheduler.compute({ ease: 2.5, interval: 15 }, 0);
    expect(r.interval).toBe(1);
  });

  it('ease floor at 1.3', () => {
    const r = SM2Scheduler.compute({ ease: 1.3, interval: 1 }, 0);
    expect(r.ease).toBe(1.3);
  });

  it('Easy increases ease', () => {
    const r = SM2Scheduler.compute({ ease: 2.5, interval: 0 }, 5);
    expect(r.ease).toBeGreaterThan(2.5);
  });

  it('next_review is YYYY-MM-DD local date', () => {
    const r = SM2Scheduler.compute({ ease: 2.5, interval: 0 }, 4);
    expect(r.next_review).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('last_reviewed is UTC', () => {
    const r = SM2Scheduler.compute({ ease: 2.5, interval: 0 }, 4);
    expect(r.last_reviewed).toMatch(/Z$/);
  });
});

describe('SRSCardWriter', () => {
  it('serializes basic card', () => {
    const yaml = SRSCardWriter.serialize({
      id: 'test', question: 'Q', answer: 'A',
      ease: 2.5, interval: 1, next_review: '2026-04-23',
      last_reviewed: '2026-04-22T10:00:00Z', tier: 'warm'
    });
    expect(yaml).toContain('id: test');
    expect(yaml).toContain('ease: 2.5');
    expect(yaml).toMatch(/^---\n/);
  });

  it('uses block scalar for multiline', () => {
    const yaml = SRSCardWriter.serialize({
      id: 'multi', question: 'Line 1\nLine 2', answer: 'A',
      ease: 2.5, interval: 0, next_review: '2026-04-22', tier: 'warm'
    });
    expect(yaml).toContain('question: |');
  });

  it('uses block scalar for string with ---', () => {
    const yaml = SRSCardWriter.serialize({
      id: 'dash', question: 'What does --- mean?', answer: 'A',
      ease: 2.5, interval: 0, next_review: '2026-04-22', tier: 'warm'
    });
    expect(yaml).toContain('question: |');
  });

  it('preserves unknown keys', () => {
    const yaml = SRSCardWriter.serialize({
      id: 'u', question: 'Q', answer: 'A',
      ease: 2.5, interval: 0, next_review: '2026-04-22', tier: 'warm',
      custom: 'value'
    });
    expect(yaml).toContain('custom: value');
  });

  it('omits absent optional keys', () => {
    const yaml = SRSCardWriter.serialize({
      id: 'o', question: 'Q', answer: 'A',
      ease: 2.5, interval: 0, next_review: '2026-04-22', tier: 'warm'
    });
    expect(yaml).not.toContain('last_reviewed');
    expect(yaml).not.toContain('source_note');
  });
});

describe('ReviewQueueBuilder', () => {
  it('includes due and overdue cards', () => {
    const today = SM2Scheduler._todayLocal();
    const q = ReviewQueueBuilder.build([
      { next_review: today, id: 'due' },
      { next_review: '2099-01-01', id: 'future' },
      { next_review: '2020-01-01', id: 'overdue' }
    ]);
    expect(q).toHaveLength(2);
    expect(q.some(c => c.id === 'due')).toBe(true);
    expect(q.some(c => c.id === 'overdue')).toBe(true);
  });

  it('returns empty for empty input', () => {
    expect(ReviewQueueBuilder.build([])).toHaveLength(0);
  });
});

describe('Local date utility', () => {
  it('_todayLocal returns YYYY-MM-DD', () => {
    expect(SM2Scheduler._todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('_addDays crosses month boundary', () => {
    expect(SM2Scheduler._addDays('2026-04-29', 3)).toBe('2026-05-02');
  });
});
