# Active plan — Phase 2a: scaffold folders + prompt templates + file-per-card SRS

**Status:** revised after council round 1 (2026-04-21); awaiting council round 2 + human approval. Not yet executing.
**Branch:** `feat/phase-2a-scaffold-folders-prompts`
**Base:** `main` @ `4b82914` (Phase 1 squash-merge).
**Prior context:** Phase 1 (council harness bootstrap) is merged. Phase 2 is split into sub-plans per the human's option-B ruling (2026-04-21); this plan covers Phase 2a only.

## Response to council round 1

**Council decision (round 1):** REVISE. Scores: bugs 5, accessibility 10, architecture 9, cost 9, product 10, security 10. Full synthesis in PR #2's `<!-- council-report -->` comment against commit `1032532`.

**Accepted revisions (6):**
- Switch SRS from single `srs.csv` to one-file-per-card under `/srs/*.yaml`. Avoids last-write-wins data loss on SharePoint-synced concurrent edits. Knock-on: `flashcards.md` emits YAML for one card, not a CSV row.
- Define filename sanitization (slugging) rules up front in `/docs/data_schemas.md`. Windows reserved names and SharePoint-invalid chars.
- Explicit per-field nullability in the frontmatter + SRS schema. Parser in 2b has fewer branches.
- New file `/docs/data_schemas.md` as the single source of truth for frontmatter, SRS card YAML, filename slugging, and line-ending/encoding conventions.
- Prompt-template context-window discipline: `linker.md` instructs the human to paste only `_index.md` titles + frontmatter (not full bodies); `gap-analysis.md` warns to paste narrow corpus. Exact "untrusted user content" framing wording reviewed in the implementation PR.
- Carry-forward note: Phase 2c's graph-canvas plan must ship a non-visual, keyboard-navigable alternative (outline view) alongside the visual graph.

**Principled pushbacks (2), with rationale:**
- **Dates: hybrid, not all-UTC.** Audit fields (`created`, `updated`, `last_reviewed`) become ISO 8601 UTC timestamps (`YYYY-MM-DDTHH:mm:ssZ`) — correct for timezone-agnostic audit trails. But `next_review` stays **local calendar date** (`YYYY-MM-DD`, documented as local). SRS semantics are "this card is due on day X in the user's calendar" — a day concept, not a timestamp. A UTC timestamp of `2026-05-01T00:00:00Z` makes the card appear due at 5pm April 30 for a UTC-7 user, which is wrong. Council round 1 conflated audit-trail timezone hygiene (real concern) with SRS day-semantics (not a timezone bug).
- **Keep `_index.md`, rigidly pinned; do not fork to `_index.json`.** Council suggested JSON as canonical with MD regenerated from it. That doubles artifacts and doubles regenerator complexity for a solo-user app. Simpler: one `_index.md` with a pinned structure (deterministic markdown table, fixed columns, sorted deterministically) that is unambiguously both machine-parseable and human-readable. YAGNI on the second format; convert if machine consumers ever outgrow MD parsing.

**Approval-gate answers (asked by council):**
- **Q1 — defer wiki-link conflicting-title resolution to Phase 2b?** Yes. Parser-layer decision; belongs with the parser plan, not the scaffold plan.
- **Q2 — which phase owns the `_index.md` regenerator?** Phase 2b. The parser in 2b depends on `_index.md` being current; deferring the regenerator to 2d means the parser ships against a stale or empty index.

## Scope of Phase 2a

No JavaScript. No `index.html`. No DOM, no parser, no File System Access API code. Purely file-layout + prose-template + schema-doc work. The council reviews a low-risk diff; Phase 2b (the parser + DOM boundary, plus the `_index.md` regenerator) ships in its own PR with its own council review.

**Deliverables (in execution order):**

1. **Folder structure + `.gitkeep` files:** `/bedrock/.gitkeep`, `/warm/.gitkeep`, `/cold/.gitkeep`, `/_prompts/.gitkeep`, `/srs/.gitkeep`, `/docs/.gitkeep`. Lands the directories in git before any README is written.
2. **`/docs/data_schemas.md`** — single source of truth. Defines:
   - Frontmatter schema for tier-folder notes (fields, types, required/optional, nullability, examples).
   - SRS per-card YAML schema (fields, types, required/optional, date-field semantics).
   - Filename slugging rules (lowercase, alphanumerics + hyphens, max length, reserved-name escape).
   - Line-ending / encoding conventions (UTF-8, LF, no BOM) and parser tolerance requirements (Phase 2b parser must tolerate CRLF and BOM defensively).
   - `_index.md` pinned structure spec (see `_index.md` section below).
3. **Three tier folder READMEs:** `/bedrock/README.md`, `/warm/README.md`, `/cold/README.md`. Each defines the tier's purpose, frontmatter `tier:` value, lifecycle (when notes move in / out), and links to `/docs/data_schemas.md`.
4. **`/srs/README.md`** — documents the one-file-per-card architecture, the YAML schema (by reference to `/docs/data_schemas.md`), and future-writer requirements: atomic write via write-to-temp-and-rename; no single bulk file; no CSV export without formula-injection sanitization (carried forward to Phase 2c).
5. **`/_index.md` stub** — empty placeholder with a header comment reading `<!-- regenerated by index.html in Phase 2b; pinned structure per /docs/data_schemas.md; do not hand-edit -->`. Pinned structure (deterministic markdown table, fixed columns: title | tier | path | updated) is specified in `/docs/data_schemas.md` so the Phase 2b regenerator has a contract to satisfy.
6. **Five `/_prompts/*.md` templates**, in this order (most-load-bearing first):
   - `ingest.md` — normalize any pasted source to a linked markdown note with frontmatter; simplified to undergraduate mechanical-engineering level.
   - `linker.md` — given a new note plus `_index.md`, return the note with `[[links]]` injected. **Context discipline:** instructs the human to paste only the titles + frontmatter slice of `_index.md`, never full note bodies.
   - `flashcards.md` — generate YAML for a **single** SRS card file (not a CSV row). Output matches `/docs/data_schemas.md`'s per-card schema exactly.
   - `review-packet.md` — compile a targeted review for a named exam.
   - `gap-analysis.md` — find contradictions / missing concepts across a pasted corpus. **Context discipline:** explicit warning to paste narrow, targeted corpus only.

   Every template's frontmatter: `purpose`, `inputs`, `outputs`, `human_turn_budget`, `version`. Every template contains an identical, clearly-delimited "untrusted user content" framing block around the human-pasted material (exact wording approved in this PR's implementation commits before any template ships).
7. **Top-level `/README.md`** — setup (clone into a SharePoint-synced folder, `index.html` lands in Phase 2b), the GenAI.mil copy/paste loop, how to add a note, how to use a prompt template. Links to `/docs/data_schemas.md` and the five templates. ~150 lines.
8. **Nothing else.** No `index.html` stub (Phase 2b). No Power Automate docs (Phase 2d or later). No `/power-automate/` folder. No `package.json` (deferred; first decision point is whether dev tooling ships with Phase 2b's JS or later). No `_index.json` (rejected in round 1 — see Response to council round 1).

## Note frontmatter schema (locked by Phase 2a; later edits are council-gated)

Canonical schema (full spec + examples in `/docs/data_schemas.md`):

```yaml
---
title: <human-readable title>                # REQUIRED, non-null, non-empty
tier: bedrock | warm | cold                  # REQUIRED, non-null, one of three
created: 2026-04-21T14:22:00Z                # REQUIRED, ISO 8601 UTC timestamp
updated: 2026-04-21T14:22:00Z                # REQUIRED, ISO 8601 UTC timestamp
tags: [<tag>, ...]                           # REQUIRED, always an array (empty [] if none)
sources: [<url-or-path>, ...]                # OPTIONAL, array only, omit key entirely if none
---
```

Nullability is explicit per field. The Phase 2b parser treats a missing required field as a validation error (surfaced in UI as "broken note"); a missing optional field is silently absent. This prevents silent corruption where a half-parsed note sneaks into the graph view.

Rationale:
- `title` drives `[[wiki link]]` resolution (title match, not filename match; Unicode case-fold per Security checklist).
- `tier` drives filter state in 2b's UI.
- `created` / `updated` are ISO 8601 UTC timestamps so audit trails are timezone-unambiguous across devices and DST transitions.
- `tags` always present as an array (even empty) → parser has no "missing vs empty" branch.
- `sources` omitted entirely when empty → one shape when present, absent key when not.

The `/_prompts/ingest.md` template emits exactly this shape so hand-written and LLM-generated notes are indistinguishable to the parser.

## SRS per-card schema (one file per card, YAML; replaces former `srs.csv`)

Per council round 1: a single `srs.csv` shared across SharePoint-synced devices = guaranteed last-write-wins data loss on concurrent adds. One file per card lets the sync client's file-level conflict handling save us, and SM-2 updates happen in-place on a single card's file.

One file per card at `/srs/<slug>.yaml`. Filename slug rules in `/docs/data_schemas.md` (see below).

Canonical card schema (full spec + examples in `/docs/data_schemas.md`):

```yaml
---
id: 20260421-laplace-transform-pair-sine          # REQUIRED, matches filename stem
question: "What is the Laplace transform of sin(at)?"   # REQUIRED, non-empty
answer: "a / (s^2 + a^2)"                               # REQUIRED, non-empty
ease: 2.5                                               # REQUIRED, float, SM-2 initial 2.5
interval: 0                                             # REQUIRED, integer days, initial 0
next_review: 2026-04-22                                 # REQUIRED, YYYY-MM-DD LOCAL CALENDAR DATE
last_reviewed: 2026-04-21T14:22:00Z                     # OPTIONAL, ISO 8601 UTC timestamp or omit key
tier: warm                                              # REQUIRED, bedrock | warm | cold
source_note: warm/laplace-transforms.md                 # OPTIONAL, path to originating note
---
```

**Date-field semantics (this is the round-1 pushback, explicitly documented):**
- `next_review` is a **local calendar date**, not a UTC timestamp. SRS semantics are "this card is due on day X in the user's local calendar." Storing UTC would make a card nominally due `2026-05-01` appear at 5pm April 30 for a UTC-7 user, which is wrong for SRS.
- `last_reviewed` is a **UTC timestamp** — it's an audit field recording when the human pressed the review button, and should be timezone-unambiguous.
- All other dates (`created`, `updated` in note frontmatter) are UTC timestamps.
- `/docs/data_schemas.md` states this rule explicitly so the Phase 2c writer doesn't accidentally convert `next_review` to UTC.

Atomic-write requirement for future writers (Phase 2c): write-to-temp-and-rename; never truncate-and-rewrite in place. Documented in `/srs/README.md`.

Encoding / line-ending conventions (both note markdown and SRS YAML): UTF-8, LF endings, no BOM. Parser in 2b tolerates CRLF and BOM defensively (SharePoint OneDrive sometimes rewrites).

## Filename slugging rules (per `/docs/data_schemas.md`)

For both note filenames (from `title:`) and SRS card filenames (from `id:`):
- Lowercase ASCII; Unicode accents stripped via NFKD + ASCII-only filter.
- Alphanumerics + ASCII hyphens only; all other chars → hyphen; collapse runs of hyphens; trim leading/trailing hyphens.
- Windows reserved names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`) are prefixed with a leading underscore.
- Max stem length 80 chars; truncate at a hyphen boundary when possible.
- Extension: `.md` for notes, `.yaml` for SRS cards.

Collision handling: if two notes would slug to the same filename, the second appends `-2`, `-3`, etc. Authorship-order stable. Full algorithm spec + worked examples in `/docs/data_schemas.md`.

## Execution order (after round-2 council + human approval)

Each step = one commit. All land on this branch; one PR. Conventional-commits `feat:` except as noted.

1. `chore: scaffold tier + prompts + srs + docs folders` — create `/bedrock/`, `/warm/`, `/cold/`, `/_prompts/`, `/srs/`, `/docs/` with `.gitkeep` each.
2. `docs: add data_schemas.md` — `/docs/data_schemas.md` (note frontmatter, SRS card YAML, filename slugging, encoding + line-ending conventions, `_index.md` pinned structure spec). This lands **before** any README or template that references it.
3. `docs: add tier READMEs` — `/bedrock/README.md`, `/warm/README.md`, `/cold/README.md`.
4. `docs: add srs/README.md` — one-file-per-card architecture, atomic-write requirement for future writers, CSV-injection sanitization carried-forward note.
5. `feat: add _index.md stub` — pinned-structure placeholder per `/docs/data_schemas.md`.
6. `feat: add ingest prompt template` — `/_prompts/ingest.md` with untrusted-content framing and `human_turn_budget` declared.
7. `feat: add linker prompt template` — `/_prompts/linker.md` with context discipline (titles + frontmatter only, not full bodies).
8. `feat: add flashcards prompt template` — emits YAML for a single `/srs/<slug>.yaml`; schema matches `/docs/data_schemas.md` exactly.
9. `feat: add review-packet prompt template` — `/_prompts/review-packet.md`.
10. `feat: add gap-analysis prompt template` — `/_prompts/gap-analysis.md` with narrow-corpus warning.
11. `docs: add top-level README.md` — setup, GenAI.mil loop, how to add a note, how to use a template. Links to `/docs/data_schemas.md` and the five templates.
12. Reflection block → `.harness/learnings.md` (council-gated per institutional-knowledge rule; posted in a follow-up PR, not this one).

Prompt-template order (steps 6–10) is load-bearing-first: `ingest` (generates notes) → `linker` (depends on `_index.md` contract) → `flashcards` (depends on SRS YAML schema) → `review-packet` → `gap-analysis`. If a template can't be written without ambiguity, stop and revise the plan.

## What this plan explicitly does NOT do

- No `index.html`. No HTML, no CSS, no JS.
- No File System Access API handle code.
- No SRS reader/writer code. No CSV writer. No YAML parser.
- No `_index.md` regenerator script — that ships in Phase 2b (per round-1 Q2 answer), because the parser depends on it being current.
- No Power Automate flow docs.
- No `package.json` for dev tooling (lint / test). Deferred. First decision point: does dev tooling ship with Phase 2b (which has the first real JS)?
- No `_index.json` — round-1 pushback, explained above.

Any of the above "NOT" items appearing in the diff is a plan-scope violation and grounds for council veto.

## Risks flagged for council round 2

1. **Schema lock-in (round 1, carried forward).** Frontmatter + SRS YAML decided now become hard to change. Last low-cost opportunity to add a field if one is missing (e.g., `author`, `license`, `confidence`, `provenance`). Speak now.
2. **Prompt templates are security surface.** Every `/_prompts/*.md` is read by a human and pasted into GenAI.mil. A prompt-injected note embedded in a template framing could manipulate the human on paste-back. Plan puts an identical, clearly-delimited "untrusted user content" framing block in every template. Exact wording reviewed in the implementation PR — Security persona should confirm the proposed wording resists the standard "ignore previous instructions" / role-flip attacks.
3. **Human-turn-budget numbers are guesses.** Initial declarations (my best guess): `ingest.md` = 2, `linker.md` = 1, `flashcards.md` = 1, `review-packet.md` = 2, `gap-analysis.md` = 3. Real data comes from the human using them. Numbers are a commitment to revise, not a claim to correctness.
4. **Encoding / SharePoint drift (round 1, addressed).** Now explicitly documented in `/docs/data_schemas.md`: UTF-8, LF, no BOM; Phase 2b parser must tolerate CRLF and BOM defensively. Round-trip stability test belongs in Phase 2c.
5. **Filename slug collisions.** `-2` / `-3` suffixing is authorship-order-stable but a user renaming a note later could create a dangling suffix. Acceptable for Phase 2a; Phase 2b's parser surfaces broken-link warnings so the human notices.
6. **Round-1 pushback: pinned `_index.md` structure only, no JSON twin.** If the council insists on JSON, the counter-ask is: which specific machine consumer in Phase 2b can't consume the pinned markdown structure? If no concrete consumer is named, YAGNI wins.
7. **Round-1 pushback: hybrid date scheme.** `next_review` stays local date; all other dates UTC. If the council insists on all-UTC for `next_review`, the counter-ask is: how does a UTC timestamp represent "day X in the user's local calendar" without ambiguity at DST transitions?

## Open questions for the council (round 2, answer in the synthesis)

1. Schema completeness — any field (`author`, `license`, `confidence`, `provenance`, or similar) that 2b/2c/2d will regret not having?
2. `human_turn_budget` frontmatter field name — stable choice, or rename before it propagates through five templates + the Cost persona?
3. Prompt-injection framing wording — identical across all five templates (single source-of-truth block), or tailored per template? Recommendation: identical, so one edit updates all five.
4. Top-level `/README.md` vs `CONTRIBUTING.md` — where does the SharePoint + file:// + Edge user workflow doc belong? `CONTRIBUTING.md` exists from Phase 1 and is dev-facing; the setup flow here is user-facing. Recommendation: top-level `/README.md`, with `CONTRIBUTING.md` focused on council + PR flow.
5. Atomic-write requirement for SRS cards — is write-to-temp-and-rename sufficient, or does the council also want a fsync / per-card backup before the rename?
6. Are the two principled pushbacks (hybrid dates, no JSON twin) acceptable, or does the council counter with stronger arguments?

## Success criteria

- Eleven implementation commits land on this branch (per Execution order).
- `git grep -n 'innerHTML\|<script'` across the working tree returns zero matches (nothing executable shipped in Phase 2a).
- Every `/_prompts/*.md` has a declared `human_turn_budget` in frontmatter.
- Every template contains the identical "untrusted user content" framing block, approved in the implementation PR before any template commit lands.
- `/docs/data_schemas.md` is the only place that specifies frontmatter / SRS YAML / slugging rules; no other file restates them.
- The `_index.md` stub matches the pinned structure in `/docs/data_schemas.md` exactly (even though empty — the header comment is the contract).
- Council round-2 synthesis approves this revised plan before any implementation commit lands.
- Human types explicit approval after seeing the round-2 synthesis.

## Anti-plan (what failure looks like)

- Smuggling `index.html` or any JS into this PR — anti-scope violation per the Product persona.
- Writing an `_index.md` regenerator — that's Phase 2b's job per round-1 Q2.
- Shipping `srs.csv` despite the round-1 decision to switch to one-file-per-card.
- Storing `next_review` as a UTC timestamp despite the round-1 pushback being accepted in this revision.
- Adding a runtime dep (even dev-only) — ask the human first per CLAUDE.md non-negotiables.
- Skipping a prompt template because "we'll add it later" — the five templates are the whole paste-back loop; partial is worse than none.
- Hand-editing `.harness/session_state.json` `last_commit` — hook-managed per CLAUDE.md.
- Reusing `override council:` — Phase 1 consumed the one-time carve-out.

## Post-merge cascade

On approval + merge of this plan's implementation PR:
- **Phase 2b** plan (new session, new branch, new PR). Scope: `index.html` skeleton + inline markdown parser + wiki-link resolver + backlinks panel + the `_index.md` regenerator (moved here from 2d per round-1 Q2). The highest-leverage security review of the entire app happens on 2b's PR. Wiki-link conflicting-title resolution lives here (per round-1 Q1). Outline/keyboard-navigable alternative for any future graph view is seeded in the 2b plan's "future accessibility" section.
- **Phase 2c** plan: graph canvas + SRS review mode (File System Access API handle + per-card YAML writer with write-to-temp-and-rename + CSV-export sanitization if any CSV export exists).
- **Phase 2d** plan: Power Automate flow docs + any remaining glue.

Each sub-plan is its own PR with its own council review. No reuse of `override council:`.
