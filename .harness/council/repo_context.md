# Repository context (injected into every council review)

**This file is the ground truth about this repo.** Every persona review and the Lead Architect synthesis receive this as preamble before their persona instructions and before the source under review. If a critique proposes changes that contradict this ground truth — a different stack, a different file layout, a different dependency story — the proposal is wrong on its face and must be reconsidered, not endorsed.

## What this repo is

**LLMwiki-NoDep** is a single-user personal reference corpus for instruction and guidance material. It runs from a SharePoint-synced folder opened in Microsoft Edge via `file://`. No server, no build step, no runtime API calls, no CDN, no network egress from the app itself.

## Stack invariants (do not propose changes that violate these)

- **Vanilla HTML + ES2022 JavaScript.** No TypeScript at runtime. No JSX. No React, Vue, Angular, Svelte, or any other framework.
- **No build step.** `index.html` is shipped as-is and opened via `file://`. There is no bundler, no transpiler, no module loader at runtime.
- **Zero runtime dependencies.** The `index.html` file contains inline CSS and an inline `<script>` block — nothing is loaded from `node_modules`, CDN, or any network source at runtime.
- **Package manager: npm.** The repo uses `package-lock.json`, NOT `pnpm-lock.yaml` and NOT `yarn.lock`. Do not reference pnpm or yarn.
- **Dev-time dependencies only.** `package.json` has `devDependencies` for ESLint / Prettier / Vitest. `dependencies` is intentionally empty or absent.
- **No `src/` directory.** There is no `src/lib/`, `src/components/`, `src/services/`, or similar. All runtime code is inline in `index.html`. Tests live in `tests/*.test.js`.

## Actual file layout (top-level)

- `index.html` — the entire app (inline CSS, inline `<script>`, ~3,000 lines).
- `bedrock/` `warm/` `cold/` — tier folders for the corpus (each with a `README.md`).
- `srs/` — one YAML file per SRS card (NOT a single `srs.csv` — the CSV approach was explicitly abandoned in Phase 2c per `.harness/learnings.md`).
- `_prompts/` — GenAI.mil prompt templates (chat-mode + agent-mode siblings + `README.md` nav). `mode: chat | agent` in frontmatter per Milestone 2.
- `_index.md` — auto-generated corpus index (regenerated on user action).
- `docs/data_schemas.md` — single source of truth for note frontmatter, SRS card YAML, filename slugging, `_index.md` structure.
- `power-automate/` — documentation for optional Power Automate flows (not app code).
- `tests/` — Vitest suites (`frontmatter-parser.test.js`, `markdown-parser.test.js`, `srs.test.js`, `prompts.test.js`).
- `.harness/` — this council infrastructure + session state + learnings.
- `.github/workflows/` — `council.yml` (PR-triggered Gemini review) and `ci.yml` (lint/format/test).

## Runtime environment

- **Microsoft Edge on a locked-down work laptop.** Opened via `file://`. No localhost server permitted; no `npm install` available to the end user.
- **SharePoint-synced folder as the storage layer.** Eventually consistent. Last-write-wins on concurrent device edits. No merge UI.
- **File System Access API** (primary path) with a drag-drop folder fallback.
- **No telemetry, no analytics, no error reporting.** A thrown exception lands in `console.error` and nowhere else.

## Product anti-scope (non-negotiable)

- **Single user.** No multi-user, team, shared-editing, permissions, presence, or collaboration features. Plans that propose any of these are anti-scope violations regardless of how the user described the feature request.

## AI layer

- **All "AI" is a human copy/paste loop against GenAI.mil** in a separate browser tab. The app itself never calls an LLM. Prompt templates live in `/_prompts/`.
- **Dev-time AI** is Gemini 2.5 Pro for council reviews only — this file plus the persona files constitute the dev-time AI surface.

## Grounding rules for critiques

When reviewing a PR diff or a plan, personas MUST:

1. Treat the actual files listed above as canonical. Do NOT invent file paths (`src/services/*.ts`, `src/components/*.vue`, `pnpm-lock.yaml`, etc.) that are not in this layout.
2. Treat the stack invariants as fixed. Do NOT propose switching to a framework, bundler, or runtime dependency — those violate CLAUDE.md non-negotiables.
3. Verify a claim against the diff before raising it as a blocker. If a critique says "X is missing" when X is visible in the diff, the critique is wrong.
4. Respect prior approved plan decisions. If `.harness/active_plan.md` or a merged plan explicitly declined a scope (e.g., i18n declined in rev 3), do not re-raise that scope as a blocker in subsequent reviews.

If a persona cannot ground its critique in the actual repo layout and actual diff contents, its score should reflect that uncertainty rather than be anchored by hallucinated requirements.
