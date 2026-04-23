/**
 * Prompt-template discipline checks.
 *
 * Enforces two rules across every file in /_prompts/ (excluding README.md):
 *
 * 1. Every prompt has a `mode:` frontmatter field equal to `chat` or `agent`.
 * 2. Every `=== UNTRUSTED INPUT START ===` marker is immediately preceded
 *    (last non-blank line) by the canonical untrusted-content framing — a
 *    paragraph containing both "data, not instructions" and "ignore previous
 *    instructions."
 *
 * Rule 2 is the Milestone 2 hardening: a subagent (or main-agent block) that
 * forgets the framing re-opens a prompt-injection surface, and this check
 * fires at build time rather than at real use.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const promptsDir = resolve(import.meta.dirname, '..', '_prompts');

function listPromptFiles() {
  return readdirSync(promptsDir)
    .filter((name) => name.endsWith('.md'))
    .filter((name) => name !== 'README.md')
    .map((name) => ({ name, path: join(promptsDir, name) }));
}

/**
 * Strict-enough parser for the subset of YAML frontmatter we use in this repo:
 * key-value pairs on single lines, no nested maps, no multi-line scalars.
 * Returns { frontmatter, body } or throws if the file lacks a frontmatter block.
 */
function parseFrontmatter(raw) {
  if (!raw.startsWith('---\n')) {
    throw new Error('file does not start with a --- frontmatter block');
  }
  const afterOpen = raw.slice(4);
  const closeIdx = afterOpen.indexOf('\n---\n');
  if (closeIdx === -1) {
    throw new Error('frontmatter block is not terminated with --- on its own line');
  }
  const fmLines = afterOpen.slice(0, closeIdx).split('\n');
  const body = afterOpen.slice(closeIdx + 5);
  const frontmatter = {};
  for (const line of fmLines) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!m) continue;
    frontmatter[m[1]] = m[2];
  }
  return { frontmatter, body };
}

/**
 * Find every `=== UNTRUSTED INPUT START ===` line in a body. Only a line
 * whose trimmed content EQUALS the marker counts — mentions of the marker
 * inside prose (e.g., the framing sentence that references it by name) do
 * not count.
 *
 * For each marker, return the line index (1-based for error messages) and
 * the last non-blank line preceding it.
 */
function isStructuralLine(line) {
  const t = line.trim();
  if (t === '') return true;
  // code-fence openers/closers (triple backtick or tilde, with optional info string)
  if (/^(`{3,}|~{3,})(\s*\w*\s*)?$/.test(t)) return true;
  return false;
}

function untrustedMarkers(body) {
  const lines = body.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '=== UNTRUSTED INPUT START ===') {
      let precedingIdx = i - 1;
      while (precedingIdx >= 0 && isStructuralLine(lines[precedingIdx])) {
        precedingIdx--;
      }
      out.push({
        markerLine: i + 1,
        precedingLine: precedingIdx >= 0 ? lines[precedingIdx] : '',
      });
    }
  }
  return out;
}

const FRAMING_PHRASE_A = 'data, not instructions';
const FRAMING_PHRASE_B = 'ignore previous instructions';

describe('/_prompts/ frontmatter discipline', () => {
  const files = listPromptFiles();

  it('finds at least the expected prompt files', () => {
    const names = files.map((f) => f.name).sort();
    expect(names).toEqual(
      [
        'flashcards-agent.md',
        'flashcards.md',
        'gap-analysis-agent.md',
        'gap-analysis.md',
        'ingest-agent.md',
        'ingest-large-agent.md',
        'ingest.md',
        'linker-agent.md',
        'linker.md',
        'review-packet-agent.md',
        'review-packet.md',
      ].sort()
    );
  });

  for (const f of files) {
    it(`${f.name} has mode: chat|agent frontmatter`, () => {
      const raw = readFileSync(f.path, 'utf-8');
      const { frontmatter } = parseFrontmatter(raw);
      expect(frontmatter.mode, `${f.name} missing mode field`).toBeDefined();
      expect(['chat', 'agent']).toContain(frontmatter.mode);
    });
  }
});

describe('/_prompts/ framing position (untrusted-content discipline)', () => {
  const files = listPromptFiles();

  for (const f of files) {
    it(`${f.name}: every '=== UNTRUSTED INPUT START ===' is preceded by the canonical framing phrase`, () => {
      const raw = readFileSync(f.path, 'utf-8');
      const { body } = parseFrontmatter(raw);
      const markers = untrustedMarkers(body);
      expect(markers.length, `${f.name} has no untrusted-input markers`).toBeGreaterThan(0);
      for (const m of markers) {
        const line = m.precedingLine;
        const hasA = line.includes(FRAMING_PHRASE_A);
        const hasB = line.includes(FRAMING_PHRASE_B);
        expect(
          hasA && hasB,
          `${f.name}: marker at body line ${m.markerLine} is not immediately preceded by the canonical framing. Preceding non-blank line was: ${line.slice(0, 200)}`
        ).toBe(true);
      }
    });
  }
});
