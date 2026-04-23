# Contributing to LLMwiki-NoDep

Thank you for your interest in contributing. This document outlines how to contribute code, report issues, and propose features for the NoDep stack.

## Code of conduct

Be respectful, inclusive, and constructive in all interactions. We're building a tool for learning — let's model good learning behavior.

---

## Getting started

The target deployment is a SharePoint-synced folder on a locked-down work laptop, opened directly in Edge from `file://`. For development, you can work anywhere with git + Python 3.11 + a chromium-based browser.

1. **Fork the repository** on GitHub.
2. **Clone your fork:**
   ```bash
   git clone https://github.com/your-username/LLMwiki-NoDep.git
   cd LLMwiki-NoDep
   ```
3. **Create a feature branch:**
   ```bash
   git checkout -b feat/your-feature-name
   ```
4. **Install the harness hooks** (one time, once per clone):
   ```bash
   pip install -r .harness/scripts/requirements.txt   # only needed to run the Gemini council locally
   bash .harness/scripts/install_hooks.sh
   ```
5. **(Optional) Export a Gemini API key** if you want to run the council locally instead of waiting on PR CI:
   ```bash
   export GEMINI_API_KEY="..."
   ```
6. **Open the app:** double-click `index.html` (or right-click → Open with → Edge). No dev server, no build step.

---

## Development workflow

### Branching strategy

- `main` — always usable when opened from `file://` on a locked-down machine.
- Feature branches: `feat/description`, `fix/bug-name`, `docs/update-name`, `refactor/topic`.
- Keep branches focused on a single concern.

### Plan-first, council-gated

Before writing non-trivial code:

1. Draft your plan in `.harness/active_plan.md`, commit, push.
2. Open a PR — `.github/workflows/council.yml` runs the Gemini council and posts a `<!-- council-report -->` comment.
3. Surface the Lead Architect synthesis in the PR description or a comment; wait for explicit human approval.
4. Implement in small, testable increments on the same PR.

The exceptions list and full rules live in `CLAUDE.md`. Read it before your first PR.

### Commit messages

Follow **conventional commits**:

```
feat: add wiki-link backlink panel
fix: escape HTML in inline markdown parser
docs: document GenAI.mil paste-back loop
refactor: split SRS rendering from scheduler
test: add empty-folder edge case to File System Access fallback
chore: bump Gemini council model ID
```

Use clear, present-tense descriptions. Reference issues when applicable: `fix: resolve #42`.

### Code style

Runtime code is **vanilla ES2022 JavaScript + inline CSS + a single `index.html`**. No TypeScript at runtime, no JSX, no CSS-in-JS.

Dev-time tooling (once Phase 2 adds `package.json`):
- **ESLint** for JS quality.
- **Prettier** for formatting.
- **A test runner** (specific choice TBD via council) for unit coverage of the parser, SRS scheduler, wiki-link resolver, and CSV I/O.

Before pushing:
```bash
npm run lint:fix     # once package.json exists
npm run format       # once package.json exists
```

### Testing

Write tests (once the dev test runner is wired up) for:

- The inline markdown parser (escape-by-default coverage for every token type).
- The `[[wiki link]]` resolver (path-traversal guards, missing-target behavior).
- The per-card YAML reader / writer for `/srs/*.yaml` (atomic write-to-temp-and-rename, schema-validation on read, handle-revoked error path).
- The SM-2 scheduler (boundary cases: first review, lapse, ease floor/ceiling).
- The frontmatter parser.

Manual tests are required in addition, because unit tests can't catch File System Access API permission flows, SharePoint sync races, or Edge-specific rendering quirks. See **How to test locally** below.

---

## How to test locally

1. Open `index.html` directly in Edge or another chromium-based browser — use `file://` specifically, not `localhost`. The production target is `file://`, so anything that only works under `http://` is a regression.
2. When prompted, grant folder access via the File System Access API. If your browser doesn't support the API (Firefox, Safari), the drag-drop fallback should kick in — exercise that path too.
3. Exercise the touched feature manually:
   - Add a markdown note under the appropriate tier folder (`bedrock/`, `warm/`, `cold/`).
   - Link it from another note with `[[wiki-link syntax]]`.
   - Confirm the backlink appears in the target note's backlinks panel.
   - If you touched the SRS flow: start a review session, rate a card, confirm the corresponding `/srs/<id>.yaml` card is updated on disk.
4. Spot-check one edge case for the feature you touched (empty folder, a note with no frontmatter, a wiki link to a non-existent target, an SRS card with a missing required field, etc.).
5. Check `console.log` / `console.error` — no PII, no file contents, no API keys.

---

## How to add a note

1. Pick the right tier:
   - `bedrock/` — foundational concepts, always-on reference material.
   - `warm/` — current-focus notes (this semester, this project).
   - `cold/` — archived, kept for search but not actively maintained.
2. Create a `.md` file in that folder. Required frontmatter:
   ```yaml
   ---
   title: Concept Name
   tier: bedrock | warm | cold
   created: YYYY-MM-DD
   ---
   ```
3. Write the note in plain markdown. Use `[[Concept Name]]` for wiki links — they resolve by title across all tiers.
4. Save. On next load `index.html` picks it up automatically. `_index.md` regenerates from folder contents; do not hand-edit it.

---

## How to add a prompt template

Prompt templates live in `/_prompts/*.md` and are the thing the user pastes into GenAI.mil.

1. Create `/_prompts/<purpose>.md`. Required frontmatter:
   ```yaml
   ---
   title: What this template does in one line
   human_turn_budget: 1-2   # expected GenAI.mil round-trips to converge
   inputs: What the user should paste alongside the prompt
   output: What GenAI.mil is asked to return, in what format
   ---
   ```
2. Write the prompt body. Keep it tight — token budget matters for the human's context window, not ours. Redundant templates (two templates that overlap in purpose) will be flagged by the Cost council persona.
3. If the prompt's output is structured (CSV rows, JSON-ish frontmatter, `[[wiki link]]` injection), state the exact shape in the prompt itself so GenAI.mil can be pasted back verbatim.
4. Run through the template yourself against a real note on GenAI.mil before committing. Record the actual human-turn count in the PR description.

Adding a prompt template requires a council review (see `CLAUDE.md` "When to run the council").

---

## Submitting a pull request

1. Push your branch to your fork.
2. Open a PR on GitHub with:
   - Clear title in conventional-commit format.
   - Description of the change and why.
   - A link (or paste) of the council synthesis if you ran it locally; otherwise wait for the PR-triggered run to post its comment.
   - Screenshots for any UI change (Edge `file://` screenshots specifically).
   - Reference related issues (`Fixes #123`).
3. Respond to review feedback.
4. Ensure CI passes — the council workflow must produce a synthesis; the gitleaks step must pass.
5. **Squash & merge** once approved.

PR template:

```markdown
## What
Brief description of the change.

## Why
Problem it solves or feature it enables.

## How
Technical approach or key decisions.

## Council synthesis
Paste or link to the Lead Architect synthesis. If [skip council] applies, name the mechanical-change category from CLAUDE.md.

## Manual test notes
- Opened index.html from file:// in Edge: pass/fail
- Feature exercised: <describe>
- Edge case spot-checked: <describe>

## Checklist
- [ ] Plan-first discipline followed (if non-trivial)
- [ ] Council synthesis addressed
- [ ] Manual file:// test done
- [ ] Conventional commit message
- [ ] No new runtime dependencies
```

---

## Reporting issues

1. Check existing issues first to avoid duplicates.
2. Include:
   - Clear description with steps to reproduce.
   - Expected vs. actual behavior.
   - Environment: OS, Edge version (or other browser), whether SharePoint sync was active.
   - `console` logs (redact any PII or file paths before pasting).
   - Minimal reproduction (a sample note / CSV row, not your real corpus).
3. Labels help categorize: `bug`, `enhancement`, `docs`, `good first issue`, `help wanted`.

---

## Feature requests

1. Open an issue titled `feat: your feature idea`.
2. Describe the use case and why it matters to the single-engineer workflow.
3. Propose an approach (not required, but helpful). Be specific about how it fits the runtime constraints in `CLAUDE.md` "Runtime environment constraints."
4. Discuss before implementing — the Product council persona aggressively pushes back on features that don't serve the "add a note → link → review → find contradictions in under 2 minutes" loop.

---

## Scope discipline

Before proposing anything, re-read `.harness/council/product.md` — **anti-scope** section. This project is deliberately tiny:

- No server, no auth system, no multi-user sync, no real-time collaboration.
- No analytics, no telemetry, no error reporting.
- No build pipeline, no deploy pipeline, no CDN assets.
- No mobile UI (the target device is a work laptop).
- No cohort or group features.

Features that violate anti-scope require an explicit, written council exception before they can be discussed.

---

## Questions?

- **GitHub Discussions** — design questions or brainstorming.
- **Issues** — bug reports and feature requests.

---

**Thank you for contributing to LLMwiki-NoDep.**
