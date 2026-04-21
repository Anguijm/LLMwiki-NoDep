# Active plan — Phase 2a: scaffold folders + prompt templates + empty SRS CSV

**Status:** awaiting council review + human approval. Not yet executing.
**Branch:** `feat/phase-2a-scaffold-folders-prompts`
**Base:** `main` @ `4b82914` (Phase 1 squash-merge).
**Prior context:** Phase 1 (council harness bootstrap) is merged. Phase 2 is split into sub-plans per the human's option-B ruling (2026-04-21); this plan covers Phase 2a only.

## Scope of Phase 2a

No JavaScript. No `index.html`. No DOM, no parser, no File System Access API code. Purely file-layout + prose-template work. The council reviews a low-risk diff; Phase 2b (the parser + DOM boundary) ships in its own PR with its own council review.

**Deliverables:**

1. **Top-level `/README.md`** — setup (clone into a SharePoint-synced folder, open `index.html` in Edge — placeholder note that `index.html` lands in Phase 2b), the GenAI.mil copy/paste loop, how to add a note, how to use a prompt template. ~150 lines.
2. **Three tier folders, each with a `README.md`:**
   - `/bedrock/README.md` — what belongs here (permanent reference, rarely changes, always loaded on app open).
   - `/warm/README.md` — current-semester material (review cycle active, SRS cards auto-generated).
   - `/cold/README.md` — archived (searchable but not auto-loaded into the graph view).
   Each README ~40 lines; defines tier meaning, frontmatter `tier:` value, move-to-other-tier criteria.
3. **Top-level `/_index.md` stub** — empty placeholder with a comment explaining that Phase 2b's `index.html` regeneration script will populate it. Committed so Phase 2b has a target path to write into.
4. **`/srs.csv`** — header row only: `id,question,answer,ease,interval,next_review,last_reviewed,tier`. No rows. Explicitly UTF-8, LF line endings, no BOM. Frontmatter-free (it's CSV, not markdown).
5. **Five `/_prompts/*.md` templates:**
   - `ingest.md` — normalize any pasted source (PDF text, lecture notes, textbook chapter) to a linked markdown note with frontmatter, simplified to undergraduate mechanical-engineering level.
   - `flashcards.md` — generate Q/A pairs as CSV rows for `srs.csv`.
   - `gap-analysis.md` — find contradictions and missing concepts across a pasted corpus.
   - `review-packet.md` — compile a targeted review for a named exam.
   - `linker.md` — given a new note plus the current `_index.md`, return the note with `[[links]]` injected.

   Each template has frontmatter: `purpose`, `inputs`, `outputs`, `human_turn_budget`, `version`. Declared human-turn budget per the Cost persona's non-negotiable.
6. **Nothing else.** No `index.html` stub (Phase 2b's deliverable). No Power Automate docs (deferred to Phase 2d or later). No `/power-automate/` folder yet.

## Frontmatter schema (fixed now; changing it later is a council-gated schema change)

Every tier-folder note uses this frontmatter:

```yaml
---
title: <human-readable title>
tier: bedrock | warm | cold
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
tags: [<tag>, ...]
sources: [<url-or-path>, ...]   # optional
---
```

Rationale:
- `title` lets `[[wiki links]]` resolve by title rather than filename; the parser in Phase 2b will normalize whitespace and case-fold per Unicode.
- `tier` drives filter state in Phase 2b's UI.
- `created` / `updated` drive "recently changed" sort order.
- `tags` drive faceted filter; array form (not comma-string) so Phase 2b's parser doesn't have to split.
- `sources` is optional and is an array even when one element — one shape, fewer branches in the parser.

The `/_prompts/ingest.md` template emits exactly this shape, so hand-written and LLM-generated notes have identical frontmatter.

## CSV schema (fixed now; changing headers later is a council-gated schema change)

```
id,question,answer,ease,interval,next_review,last_reviewed,tier
```

Column semantics:
- `id` — `YYYYMMDD-<slug>` string, unique. No auto-increment integer (avoids re-key collisions when two devices add rows during SharePoint sync).
- `question`, `answer` — arbitrary text. Must be CSV-sanitized on write (leading `=`, `+`, `-`, `@`, `\t`, `\r` prefixed with `'`) per the Security checklist's CSV-injection rule. Enforcement is Phase 2c's problem; the file-format decision is Phase 2a's.
- `ease` — SM-2 ease factor. Starts at `2.5`. Float.
- `interval` — SM-2 interval in days. Integer.
- `next_review` — `YYYY-MM-DD`. Local date, not UTC (users think in local-calendar terms).
- `last_reviewed` — `YYYY-MM-DD` or empty string if never reviewed.
- `tier` — `bedrock | warm | cold`, same enum as frontmatter.

Encoding/line-ending decisions locked in now: UTF-8, LF endings, no BOM. Reason: SharePoint OneDrive clients sometimes rewrite files with CRLF and BOM; a Phase 2c test will assert round-trip stability and flag that drift if it happens.

## Execution order (after approval)

1. Folders: `/bedrock/`, `/warm/`, `/cold/`, `/_prompts/`. Each gets a `.gitkeep` immediately so the folder lands in git even before the README is written.
2. Tier READMEs: `/bedrock/README.md`, `/warm/README.md`, `/cold/README.md`.
3. `/srs.csv` with header row.
4. `/_index.md` stub with `<!-- regenerated by index.html in Phase 2b -->` placeholder.
5. Five prompt templates: order `ingest` → `linker` → `flashcards` → `review-packet` → `gap-analysis` (from most-load-bearing downstream consumers to least).
6. Top-level `/README.md`.
7. Reflection block to `.harness/learnings.md` (council-gated per institutional-knowledge rule — posted in a follow-up PR, not this one).

Each step is a single commit (conventional-commits prefix `feat:` except the reflection which is `docs:`). All seven land on this branch; one PR.

## What this plan explicitly does NOT do

- No `index.html`. No HTML, no CSS, no JS.
- No File System Access API handle code.
- No CSV reader/writer code.
- No `_index.md` regenerator script.
- No Power Automate flow docs.
- No `package.json` for dev tooling (lint / test). Deferred — first decision point is whether dev tooling ships with Phase 2b (needs lint for the JS) or later. Flagging for the council: is it wasteful to ship `package.json` with zero JS?

Any of the above "NOT" items appearing in the diff is a plan-scope violation and grounds for council veto.

## Risks flagged for council

1. **Schema lock-in.** Frontmatter + CSV headers decided now become hard to change. If a reviewer spots a missing field that's cheap now but expensive later (e.g., `author`, `license`, `confidence`), speak now.
2. **Prompt templates are security surface.** Every `/_prompts/*.md` is read by a human and pasted into GenAI.mil. A prompt-injected note embedded in a template framing could manipulate the human on paste-back. The plan puts an explicit "the following is untrusted user content" block in every template. The Security persona should gut-check the exact framing wording.
3. **Human-turn-budget numbers are guesses.** I'll declare an initial `human_turn_budget` per template (best guess: `ingest.md` = 2, `flashcards.md` = 1, `gap-analysis.md` = 3, `review-packet.md` = 2, `linker.md` = 1). Real data comes from the human actually using them. The budget numbers are a commitment to revise, not a claim to correctness.
4. **CSV encoding assumptions.** UTF-8 + LF + no BOM is the defensible choice, but SharePoint/OneDrive has been observed to rewrite files. If the council thinks a BOM or CRLF guard should be baked in now rather than discovered in Phase 2c, adjust.
5. **`_index.md` stub is load-bearing.** Phase 2b's regeneration script writes to this exact path. If the council prefers a different contract (e.g., `_index.json` for machine consumption + `_index.md` for humans, generated from the same source), change it now before Phase 2b commits.

## Open questions for the council (answer in the synthesis)

1. Frontmatter schema — anything obviously missing that Phase 2b would regret?
2. CSV header set — `ease` and `interval` assume SM-2. Prompt's Phase 2 brief also specifies SM-2, so this is consistent; re-confirm.
3. The `human_turn_budget` frontmatter field name — stable choice, or rename now? (Changing later propagates through every template and the Cost persona.)
4. Prompt-injection framing exact wording — should it be identical across all five templates, or tailored per template?
5. Is the top-level `/README.md` the right audience for the SharePoint + file:// + Edge workflow doc, or should that live in `CONTRIBUTING.md` (which exists from Phase 1)?

## Success criteria

- Seven commits land on this branch.
- `git grep -n 'innerHTML\|<script'` across the working tree returns zero matches (nothing executable shipped in Phase 2a).
- Every `/_prompts/*.md` has a declared `human_turn_budget` in frontmatter.
- CSV header row matches the spec exactly (whitespace, column order, case).
- Council synthesis approves before any commit lands after this plan.
- Human types explicit approval after seeing the synthesis.

## Anti-plan (what failure looks like)

- Smuggling `index.html` or any JS into this PR — an "anti-scope violation" per the Product persona.
- Adding a runtime dep (even dev-only) — ask the human first per CLAUDE.md non-negotiables.
- Skipping a prompt template because "we'll add it later" — the five templates are the whole paste-back loop; partial is worse than none.
- Hand-editing `.harness/session_state.json` `last_commit` — hook-managed per CLAUDE.md.
- Reusing `override council:` — Phase 1 consumed the one-time carve-out.

## Post-merge cascade

On approval + merge of this plan's implementation PR:
- Phase 2b plan written (same shape, different `.harness/active_plan.md` content, new branch). Scope: `index.html` skeleton + inline markdown parser + wiki-link resolver + backlinks panel. The highest-leverage security review of the entire app will happen on Phase 2b's PR.
- Phase 2c plan: graph canvas + SRS review mode (File System Access API handle + CSV write path).
- Phase 2d plan: `_index.md` regeneration + Power Automate flow docs.

Each sub-plan is its own PR with its own council review.
