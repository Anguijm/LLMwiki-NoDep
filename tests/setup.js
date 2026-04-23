/**
 * Test setup — extracts the inline <script> from index.html and makes
 * all module globals available for Vitest tests.
 *
 * Strategy: read the script content, wrap const declarations as
 * globalThis assignments, then execute via indirect eval.
 * This is a dev-only test harness — never runs at runtime.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const htmlPath = resolve(import.meta.dirname, '..', 'index.html');
const htmlContent = readFileSync(htmlPath, 'utf-8');

// Extract the main script block
const scriptStart = htmlContent.lastIndexOf('<script>');
const scriptEnd = htmlContent.lastIndexOf('</script>');

if (scriptStart === -1 || scriptEnd === -1) {
  throw new Error('setup.js: could not find <script> block in index.html');
}

let scriptContent = htmlContent.substring(scriptStart + '<script>'.length, scriptEnd);

// Remove 'use strict' (may be indented after Prettier)
scriptContent = scriptContent.replace(/^\s*'use strict';\s*/m, '');

// Remove the DOMContentLoaded boot line
scriptContent = scriptContent.replace(
  /document\.addEventListener\(\s*'DOMContentLoaded',\s*App\.init\s*\);?/,
  ''
);

// Detect the indentation level of the first top-level const (STRINGS or similar)
const indentMatch = scriptContent.match(/^(\s*)const\s+STRINGS\s*=/m);
const topIndent = indentMatch ? indentMatch[1] : '';

// Replace top-level `const` declarations with `globalThis.X =` assignments
// Only match consts at the detected top indentation level
const constRegex = new RegExp('^' + topIndent + 'const\\s+(\\w+)\\s*=\\s*', 'gm');
scriptContent = scriptContent.replace(constRegex, (match, name) => {
  return topIndent + 'globalThis.' + name + ' = ';
});

// Execute the modified script via indirect eval.
// DELIBERATE CHOICE: this is a dev-only test harness. Indirect eval
// is the only way to make const/let declarations from the inline script
// available as globals without refactoring index.html into ES modules
// (which would break file:// compatibility). eval() is FORBIDDEN in
// application code (index.html) — enforced by ESLint no-eval rule.
(0, eval)(scriptContent);

// Verify key globals are available
const requiredGlobals = [
  'FrontmatterParser', 'MarkdownParser', 'WikiLinkResolver',
  'IndexRegenerator', 'BacklinkGraph', 'FolderScanner', 'SRSCardParser',
  'SM2Scheduler', 'SRSCardWriter', 'ReviewQueueBuilder', 'STRINGS',
  'Slugger', 'SectionDelimiterParser',
];

for (const name of requiredGlobals) {
  if (typeof globalThis[name] === 'undefined') {
    throw new Error(`setup.js: global '${name}' not available after script execution`);
  }
}
