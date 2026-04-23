import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(__dirname, 'eslint-fixtures/dom-sinks.js');
const indexPath = resolve(__dirname, '..', 'index.html');

function restricted(messages) {
  return messages.filter((m) => m.ruleId === 'no-restricted-syntax');
}

describe('DOM-injection-sink ESLint ban', () => {
  it('fires on every banned sink pattern in the fixture (6 total: 2 per sink, dotted + computed)', async () => {
    const eslint = new ESLint({ ignore: false });
    const [result] = await eslint.lintFiles([fixturePath]);
    const errors = restricted(result.messages);
    expect(errors).toHaveLength(6);
    for (const e of errors) {
      expect(e.severity).toBe(2);
    }
  });

  it('surfaces each banned sink name in at least one error message', async () => {
    const eslint = new ESLint({ ignore: false });
    const [result] = await eslint.lintFiles([fixturePath]);
    const messages = restricted(result.messages).map((m) => m.message);
    expect(messages.some((m) => m.includes('innerHTML'))).toBe(true);
    expect(messages.some((m) => m.includes('outerHTML'))).toBe(true);
    expect(messages.some((m) => m.includes('insertAdjacentHTML'))).toBe(true);
  });

  it('index.html has zero violations (regression pin — any new sink must add a scoped eslint-disable)', async () => {
    const eslint = new ESLint({ ignore: false });
    const [result] = await eslint.lintFiles([indexPath]);
    expect(restricted(result.messages)).toHaveLength(0);
  });
});
