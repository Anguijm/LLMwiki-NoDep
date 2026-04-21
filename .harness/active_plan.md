# Active plan — Dev tooling: ESLint, Prettier, test runner

**Status:** draft — awaiting council round 1 + human approval. Not yet executing.
**Branch:** `chore/dev-tooling`
**Base:** `main` @ `5f0fbcd` (Phase 2d merged).
**Prior context:** Phase 2 is complete. The app ships as a single `index.html` with zero runtime deps. `test.html` runs in-browser manually. This PR adds dev-time tooling to enforce code quality and enable automated test runs.

## Scope

Dev-time tooling only. **Nothing in this PR ships to the user.** The `index.html` file remains zero-dependency. Dev tools run during development and CI, not at runtime.

**Deliverables:**

1. **`package.json`** — `devDependencies` only. No `dependencies`. No `bundledDependencies`. No runtime scripts.

2. **ESLint** — JS linting for `index.html`'s `<script>` block:
   - `eslint` + `eslint-plugin-html` (to lint inline scripts in HTML files)
   - Config: ES2022, browser globals, no-unused-vars, no-undef, semi, eqeqeq
   - `npm run lint` script

3. **Prettier** — formatting:
   - `prettier` + `prettier-plugin-html` (optional, for HTML formatting)
   - Config: single quotes, 2-space indent, trailing comma ES5, print width 120
   - `npm run format` and `npm run format:check` scripts

4. **Vitest** — test runner for headless test execution:
   - `vitest` + `happy-dom` (lightweight DOM environment)
   - Extract test suites from `test.html` into `tests/*.test.js` files that import the modules
   - Since modules are globals in `index.html`, the test setup will extract the `<script>` block content and eval it in the happy-dom environment to make globals available
   - `npm run test` script
   - `test.html` continues to work as-is for manual browser testing

5. **`.github/workflows/ci.yml`** — CI workflow:
   - Runs on `pull_request` and `push` to `main`
   - Steps: `npm ci` → `npm run lint` → `npm run format:check` → `npm run test`
   - Runs after the existing council workflow (not replacing it)

6. **Lockfile** — `package-lock.json` committed per security checklist requirement.

## What this PR explicitly does NOT do

- No changes to `index.html` content or behavior.
- No runtime dependencies. `dependencies` in `package.json` stays empty (or absent).
- No build step. No bundler. No transpiler. No TypeScript.
- No changes to `test.html` (it continues to work standalone in-browser).
- No changes to the council workflow or harness.

## Dev dependency justification (per security checklist)

Each dev dep must be justified with maintainer, downloads, and last-update age:

| Package | Maintainer | Weekly downloads | Last update | Justification |
|---|---|---|---|---|
| `eslint` | OpenJS Foundation | ~35M | Active | Industry-standard JS linter |
| `eslint-plugin-html` | BenoitZugmeyer | ~500K | Active | Lints inline `<script>` in HTML files |
| `prettier` | Prettier team | ~35M | Active | Industry-standard formatter |
| `vitest` | Vitest team (Vue ecosystem) | ~10M | Active | Fast, Vite-based test runner with happy-dom support |
| `happy-dom` | capricorn86 | ~8M | Active | Lightweight DOM implementation for testing |

No single-function, low-star, sole-maintainer packages. All are established, high-download, actively maintained.

## Test extraction strategy

The modules in `index.html` (`FrontmatterParser`, `MarkdownParser`, `WikiLinkResolver`, etc.) are globals in an inline `<script>`. To test them in Node/Vitest without refactoring:

1. A `tests/setup.js` file reads `index.html`, extracts the `<script>` block content, and evaluates it in the happy-dom environment.
2. After eval, all module globals (`FrontmatterParser`, `MarkdownParser`, etc.) are available on `globalThis`.
3. Each `tests/*.test.js` file imports from `setup.js` and runs assertions using Vitest's `expect` API.
4. Test cases mirror `test.html` exactly — same coverage, same assertions, different runner.

This avoids refactoring `index.html` into ES modules (which would break `file://` compatibility).

## ESLint configuration

```json
{
  "env": { "browser": true, "es2022": true },
  "plugins": ["html"],
  "rules": {
    "eqeqeq": ["error", "always"],
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-undef": "error",
    "semi": ["error", "always"],
    "no-eval": "error",
    "no-implied-eval": "error"
  },
  "globals": {
    "FrontmatterParser": "readonly",
    "MarkdownParser": "readonly",
    "WikiLinkResolver": "readonly",
    "IndexRegenerator": "readonly",
    "BacklinkGraph": "readonly",
    "FolderScanner": "readonly",
    "SRSCardParser": "readonly",
    "SM2Scheduler": "readonly",
    "SRSCardWriter": "readonly",
    "ReviewQueueBuilder": "readonly",
    "App": "readonly",
    "STRINGS": "readonly"
  }
}
```

## Prettier configuration

```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 120,
  "semi": true
}
```

## CI workflow

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm run test
```

## Execution order

1. `chore: add package.json with dev dependencies`
2. `chore: add ESLint config and lint script`
3. `chore: add Prettier config and format scripts`
4. `chore: add Vitest config and test setup`
5. `test: extract test suites from test.html to Vitest`
6. `ci: add CI workflow for lint + format + test`
7. `style: fix any lint/format issues in index.html` (auto-fixable only — no behavioral changes)

## Risks

1. **Prettier reformatting `index.html`.** Prettier may reformat the inline CSS/JS in ways that produce a large diff. Mitigation: commit the format fix as a separate `style:` commit so the diff is reviewable.
2. **ESLint false positives.** The inline script uses `var` and function hoisting patterns that modern ESLint rules may flag. Mitigation: configure rules to match the existing code style, not fight it.
3. **Test extraction fragility.** Extracting the `<script>` block via string manipulation is brittle if the HTML structure changes. Mitigation: the extraction uses a simple regex for `<script>` tags and is tested itself.

## Success criteria

- `npm run lint` passes with zero errors.
- `npm run format:check` passes (code is formatted).
- `npm run test` passes all test suites.
- CI workflow runs on PRs and passes.
- `test.html` still works unchanged in-browser.
- `index.html` has zero behavioral changes.
- No runtime dependencies in `package.json`.
