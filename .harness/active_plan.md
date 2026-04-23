# Active plan — Session close: Phase 3 docs-currency sweep + reflection

**Status:** Plan draft, revision 2. Follow-up to PR #12 (M3 docs-gap closure, merged as `e0d2adf`). This PR does two discrete jobs bundled by theme — **documentation currency** across the repo:

1. Correct documentation that went stale across Phase 3 (architecture persona still references `srs.csv`, `CONTRIBUTING.md` still references `srs.csv`, `docs/data_schemas.md` missing M3 delimiter spec and M2 prompt-frontmatter section, `README.md` prompt table missing M2 agent-mode siblings).
2. Append the Phase 3 session-close reflection to `.harness/learnings.md`.
3. Convert `tests/prompts.test.js` from a hard-coded expected-files list to a glob-based discovery check (promoted into this PR per council round-1 bugs-persona guidance; was previously in IMPROVE for follow-up).

**Branch:** `chore/session-close-docs-currency-and-reflection`.
**Base:** `main` @ `5270fa8` (post-PR-#12 harness-state refresh).
**Council posture:** multiple council-gated surfaces touched — a persona edit (`.harness/council/architecture.md`), a schema change (`docs/data_schemas.md`), and a `learnings.md` append. All three are explicitly council-required per CLAUDE.md. One PR is correct bundling because the edits share a theme (Phase 3 caught up to reality) and a single council sweep reviews the lens-shift + reflection together.

**Rev 2 changes (council round 1 Proceed + Codex P2 inline comments):**
- Codex flagged Edit 1's SRS-YAML required-fields list conflated required + optional fields. Corrected to distinguish: required (`id`, `question`, `answer`, `ease`, `interval`, `next_review`, `tier`) vs optional (`last_reviewed`, `source_note`) per `docs/data_schemas.md` lines 96, 98.
- Codex flagged Edit 2's proposed parser-error-category list used names that don't match the shipped parser. Corrected the list against the actual `index.html` source (lines 2210–2492): `delimiter.too-many-sections` (not `parser.too-many-sections`), `delimiter.mismatched-close` (not `delimiter.mismatched-slug`), and added `delimiter.malformed-<role>`, `frontmatter.unterminated`. Removed `frontmatter.invalid-title` (not a real category).
- Council bugs persona asked for the audit method to be stated explicitly; added one-line note under "Why now."
- Council bugs persona asked the reflection's "brittle test" definition to be concrete; rewrote that note with a specific threshold.
- Council bugs persona asked the `tests/prompts.test.js` glob conversion to land in this PR rather than an IMPROVE-listed follow-up; added as Edit 6.

**Audit method:** read-only audit performed 2026-04-24 by cross-referencing shipped code on `main` @ `5270fa8` (post-PR-#12) + `.harness/council/repo_context.md` against every `.md` file in `/`, `/_prompts/`, `/docs/`, `/bedrock/`, `/warm/`, `/cold/`, `/power-automate/`, `/.harness/`, and `/.harness/council/`. "Clean" findings mean the file's claims are consistent with what the current code actually does and what `repo_context.md` says the stack is; "stale" findings cite the specific line and the specific fact that is wrong.

## Why now

User directive (2026-04-24 session): *"All documentation should be reviewed for currency and updated as appropriate before we prep a session for graceful handoff and shutdown. Reflection is part of that."*

A read-only audit of the repo's documentation surface found five concrete staleness issues and one missing feature in the schema doc. Two of the issues have **compounding blast radius** — they influence every future decision the agent makes on the affected axis:

- **`.harness/council/architecture.md` still treats `srs.csv` as the load-bearing metadata format.** Five separate lines (9, 12, 24, 30, 55) reference `srs.csv`, its header row, its column semantics, and rollback-to-CSV. But SRS was re-architected to one-file-per-card YAML under `/srs/` (already reflected in `.harness/council/repo_context.md`). Every future architecture-axis council review currently runs against the wrong mental model of the storage layer — a council-infrastructure issue on the same tier as the hallucinated-Vue-stack incident that drove PR #10.
- **`docs/data_schemas.md` is the repo's "single source of truth" for on-disk contracts (its own line 3)** but does not document the M3 `<<<LLMWIKI-SECTION:slug>>>` delimiter spec or the M2 `mode:` / `human_turn_budget:` prompt frontmatter fields. Both the M2 plan and M3 plan committed to adding these. They did not land.

The three other issues (`CONTRIBUTING.md` CSV references, `README.md` prompt table missing agent-mode siblings, session-close reflection not yet appended) are lower-leverage but belong in the same sweep rather than accreting as separate PRs.

## Scope — five file edits in one PR

### Edit 1 — `.harness/council/architecture.md` (HIGH leverage: persona change)

Replace all `srs.csv` references with the current per-card YAML architecture. Specifically:

- **Line 9** (file-layout contract): change `srs.csv` in the metadata list to `/srs/<id>.yaml` (one file per card). Keep the list structure; swap the item.
- **Lines 12** ("CSV schema stability for `srs.csv`"): rewrite the whole bullet as "**Per-card YAML schema stability for `/srs/*.yaml`.**" Document the YAML fields per `docs/data_schemas.md` — required: `id`, `question`, `answer`, `ease`, `interval`, `next_review`, `tier`; optional: `last_reviewed`, `source_note`. Preserve the load-bearing-for-SM-2-and-review-UI framing. Required-field removals or semantic changes are architectural changes (require council + migration plan); optional fields may be added or removed without a schema-level rollback.
- **Line 24** ("if this change touches `srs.csv`"): change to "if this change touches `/srs/*.yaml`" and rewrite the guard — schema-stability guard is about per-card field additions (opt-in, never remove existing fields), not column-ordering.
- **Line 30** ("corrupts notes or `srs.csv`"): change to "corrupts notes or `/srs/*.yaml` cards."
- **Line 55** ("Renaming, reordering, or removing a column from `srs.csv`"): change to "Removing or repurposing a required field from the `/srs/*.yaml` schema."

No other changes to the architecture persona — its lens (file-layout contract, schema stability, parser boundary, rollback) is correct; only the specific storage-layer reference is stale.

### Edit 2 — `docs/data_schemas.md` (HIGH leverage: schema change, council-gated per CLAUDE.md § "When to run the council")

Two additions:

**A. New section: "Multi-section import delimiter spec"** — add after the existing `SharePoint-sync conflict handling` section, before `Security considerations`. Content:

- The `<<<LLMWIKI-SECTION:slug>>>` opening sentinel and `<<<LLMWIKI-SECTION-END:slug>>>` closing sentinel format, slug-only-on-sentinel (no `title="..."` attributes) rule, and per-section YAML frontmatter inside the wrapper.
- The 200-section cap (`parser.too-many-sections` diagnostic) and rationale (UI responsiveness bound).
- The slug re-derivation rule — the agent's emitted slug is a suggestion; the canonical slug derives from `title` via `Filename slugging` (existing section).
- The literal-sentinel escape rule — source content containing literal `<<<LLMWIKI-SECTION:` / `<<<LLMWIKI-SECTION-END:` must be escaped with `&lt;` to avoid nested-open or orphan-close parse errors.
- The differentiated parse-error category list, verified against the shipped parser at `index.html` lines 2210–2492: `delimiter.invalid-slug`, `delimiter.unterminated-section`, `delimiter.orphan-close`, `delimiter.nested-open`, `delimiter.mismatched-close` (opening slug does not match its closing slug — distinct from orphan-close and unterminated-section), `delimiter.too-many-sections` (> 200), `delimiter.malformed-<role>` (parameterized by delimiter role; emitted when a sentinel line is structurally malformed in a way specific to its role — open vs close), `frontmatter.missing-block`, `frontmatter.unterminated` (opening `---` without a matching closing `---`), `frontmatter.yaml-parse-error`.
- Cross-reference back to `_prompts/ingest-large-agent.md` for the producer-side prompt contract.

Consuming reference: the parser lives in `index.html` (shipped in PR #11); the prompt lives in `_prompts/ingest-large-agent.md` (shipped in PR #12). `data_schemas.md` is the contract between them.

**B. New section: "Prompt template frontmatter"** — add at the end of the file, after `Security considerations`. Content:

- Every file in `/_prompts/` (except `README.md`) carries YAML frontmatter with required fields: `purpose:`, `inputs:`, `outputs:`, `mode:` (enum `chat | agent`), `human_turn_budget:` (integer), `version:` (integer).
- Semantics of `mode:` — chat = single GenAI.mil chat turn; agent = main + subagents orchestration.
- Semantics of `human_turn_budget:` — **paste round-trips between the human and GenAI.mil**, not internal agent turns. For agent-mode prompts, internal subagent hops are free; only the human's clipboard round-trips count.
- Enforcement: `tests/prompts.test.js` asserts every non-README `.md` file in `/_prompts/` has a `mode:` field and that the untrusted-content framing sentence is the last non-blank line before every `=== UNTRUSTED INPUT START ===` marker.

### Edit 3 — `CONTRIBUTING.md` (MEDIUM leverage: human-facing doc)

Replace the two `srs.csv` references:

- **Line 93**: "The CSV reader / writer for `srs.csv` (CSV-injection guards, round-trip fidelity)." → "The per-card YAML reader / writer for `/srs/*.yaml` (atomic write-to-temp-and-rename, schema-validation on read, handle-revoked error path)."
- **Line 109**: "If you touched the SRS flow: start a review session, rate a card, confirm `srs.csv` is updated on disk." → "If you touched the SRS flow: start a review session, rate a card, confirm the corresponding `/srs/<id>.yaml` card is updated on disk."

### Edit 4 — `README.md` (MEDIUM leverage: user-facing prompt discovery)

Update the "How to use a prompt template" table (≈ lines 228–234) to show both modes for each task, plus the agent-only large-doc template. Table becomes:

| Task | Chat mode | Agent mode | Human turn budget |
|---|---|---|---|
| Normalize a source → one note with frontmatter | `ingest.md` | `ingest-agent.md` | 2 / 1 |
| Split a large source document into one note per section | — (agent only) | `ingest-large-agent.md` | — / 1 |
| Inject `[[wiki links]]` into a note | `linker.md` | `linker-agent.md` | 1 / 1 |
| Generate SRS cards | `flashcards.md` | `flashcards-agent.md` | 1 / 1 |
| Compile a targeted refresher on a topic | `review-packet.md` | `review-packet-agent.md` | 2 / 1 |
| Find contradictions / missing concepts | `gap-analysis.md` | `gap-analysis-agent.md` | 3 / 1 |

Budgets are best-effort from each prompt's frontmatter; verify during implementation by reading each prompt file's `human_turn_budget:` field. If a prompt's frontmatter value differs from the plan, trust the frontmatter (source of truth) and update this table accordingly.

Also update the short paragraph that follows the table ("Usage pattern for each is identical…") to briefly point at `_prompts/README.md` for the chat-vs-agent picking guide, since that guide now lives in one place.

No other README changes (the Quick start, folder structure, Import-view how-to, and Troubleshooting sections are all current).

### Edit 5 — `.harness/learnings.md` (HIGH leverage: institutional knowledge, council-gated per CLAUDE.md)

Append a `## 2026-04-24 — Phase 3 complete (M1 + M2 + M3 + docs-gap closure)` block with KEEP / IMPROVE / INSIGHT / COUNCIL subsections. Content (drafted for council review, final text subject to round-1 feedback):

**KEEP:**
- Council's repo-context anchor (PR #10) eliminated stack hallucinations across the M3 code-bearing PR (13 rounds, zero hallucinations) and the M3 docs-gap PR (3 rounds, zero hallucinations). The anchor is the most leveraged piece of council infrastructure in the repo — three-paragraph file, loaded into every review, every persona gets the same ground truth.
- Docs-PR council iteration discipline held: PR #12 (docs only) merged after round 3 of Proceed rather than chasing round-4+ rotating score-9 refinements from the bugs persona. Validates the Phase-2 IMPROVE note ("merge after 3 rounds max on docs-only PRs").
- Plan-first, council-gated, human-approved, then execute — all four milestones landed with this discipline and zero incidents. The prime directive is load-bearing.
- Four prompt-hardening passes on PR #12's `ingest-large-agent.md` (double-sided sentinel escape + URL scheme guard + `---` body-line handling + invalid-subagent-output critical failure + ASCII-only frontmatter + NUL-byte stripping + empty-section placeholder) demonstrate defense-in-depth at the prompt layer for surfaces where the parser is the hard backstop. The repo's convention of "prompt is soft defense; parser is hard defense" scales.
- The Import view's delimiter format being documented in BOTH `data_schemas.md` (contract, post-this-PR) and `_prompts/ingest-large-agent.md` (producer instructions) is the right redundancy — future agents discover the spec whether they start from schema-hunting or prompt-hunting.

**IMPROVE:**
- The M2 plan committed to adding a "Prompt template frontmatter" section to `docs/data_schemas.md` and the M3 plan committed to documenting the delimiter spec there. Neither landed with the milestone they belonged to. Lesson: when a plan adds documentation requirements to a schema doc, the schema-doc edit is a deliverable, not a follow-up; include it in the milestone's "Execution order" checklist so it cannot slip silently.
- The architecture persona (`.harness/council/architecture.md`) was written in Phase 1 against the then-proposed `srs.csv` storage model. Phase 2 switched to one-file-per-card YAML (correctly reflected in `repo_context.md`) but the persona was never updated. Persona drift is a compounding blast-radius bug — every future architecture-axis review runs against a wrong mental model. Lesson: when the stack changes, persona files are first-class update targets, not optional polish. Add a persona-currency check to the pre-merge checklist for any PR that touches the storage layer, routing layer, or schema.
- Docs-gap debt from a code-focused milestone is predictable: when the agent is heads-down on code + tests + security, the producer-side prompt and user-facing README typically slip. Lesson: for code-bearing milestones that ship a new producer/consumer pair, carve the producer-side prompt into the SAME PR as the consumer-side parser OR explicitly scope a "docs-gap follow-up" PR as the plan's closing deliverable (not as a next-session task). We did the second this time; next time, try the first.
- The `tests/prompts.test.js` expected-files list was hard-coded. Every new prompt file required a one-line mechanical update. Council round-1 on this PR (PR #13) asked that the fix land here rather than get deferred — a deferred test-hygiene IMPROVE becomes a trap for the next prompt author. Addressed as Edit 6 of this PR (convert to glob-based discovery). Lesson for future PRs: when the reflection identifies a concrete test-hygiene issue, fold the fix into the same PR unless there is a specific reason it can't land. "Deferred to follow-up" is not free — it creates trap-ness that accumulates across sessions.

**INSIGHT:**
- Council persona compounding-leverage asymmetry. A single persona file defines the lens every future architecture-axis review uses. One wrong line (e.g., "CSV schema stability") propagates into thousands of future decisions. Compare to a single wrong line in a README, which is discoverable to one user at one moment. The persona files deserve the same editorial discipline as schema contracts — arguably more, because schema contracts have tests guarding them and persona contracts do not.
- Bugs-persona rotating refinements on docs PRs follow a pattern: round N finds category X (encoding, escaping, error-handling), round N+1 finds category Y, round N+2 finds category Z. Each is individually defensible; collectively they're a bucket-brigade of nice-to-haves. The kill-round policy is the right response — not because the bugs persona is wrong but because marginal defense-in-depth at round 4 costs more than the defense is worth on docs content. The persona is working as intended; the rate-limiter lives at the human-approval layer.
- The repo-context anchor's design pattern — a short, authoritative "this is the stack" preamble injected into every LLM call that reviews the code — generalizes to other meta-AI tools in other repos. Worth naming: the pattern is "load-bearing preamble" and the failure mode it prevents is "stack hallucination from text-heavy diffs." Useful to port if/when this harness is reused.
- Single-user anti-scope discipline survived four milestones of pressure from the product persona. Every milestone saw product-persona probing for "team," "shared," or "multi-user" surface area; every milestone held the line. Explicit anti-scope in CLAUDE.md + plan bodies works when the human is disciplined about re-affirming it during council reviews.

**COUNCIL:**
- PR #7 (M1) round 1: product persona (score 2 / blocker) vetoed "team / shared corpus" framing as anti-scope violation. Reframe to "single-user personal reference corpus" was the right response. Product-persona as anti-scope guardian is working.
- PR #9 (M2) round 1: council hallucinated a Vue / pnpm / `src/lib/` stack against a pure-markdown diff. Override-merged on evidence; root-cause-fixed in PR #10 via the repo-context anchor. The `override council:` escape hatch is reserved for exactly this class of failure and should not be expanded.
- PR #11 (M3) rounds 1–13: 11 Proceed, 2 Revise, zero hallucinations. Rev 2 Revise caught collision-check staleness (pre-commit rescan added). Rev 12 Revise caught serializer newline-safety edge cases. Both were legitimate catches that a scoped anchor could not preempt.
- PR #12 (docs-gap) rounds 1–3: all Proceed, zero non-negotiables, bugs-persona rotated score-9 items each round. Validated the 3-round-kill heuristic on docs PRs.

**Counter to Phase 2 note on test extraction from `index.html`:** the Phase 2 IMPROVE proposed extracting modules from `index.html` to shared `.js` files if the file grew much larger. `index.html` is now 5,885 lines (Phase 3 M3 added ~1,000 lines). The test-extract-via-eval pattern still holds; no extraction has been necessary. The note's threshold ("if `index.html` grows much larger") has been crossed and the extraction was still not the right call. **Revised trigger:** revisit extraction if — and only if — tests fail on changes that don't touch the code they cover (e.g., a Prettier-reformat of unrelated `index.html` code breaks an unrelated test's eval-parse step), and the failure happens more than once per milestone. File-length alone is not a sufficient trigger; brittleness — measured as failure correlation with unrelated edits — is. As of this session, that threshold has not been crossed; keep the eval-extract pattern.

### Edit 6 — `tests/prompts.test.js` (MEDIUM leverage: test-hygiene; promoted into this PR per council round-1 bugs-persona guidance)

Convert the hard-coded expected-files list to glob-based discovery. Specifically:

- Remove the `'finds at least the expected prompt files'` test's `toEqual(...sorted)` check against a hard-coded name list (current lines 95–111).
- Replace with a glob-based assertion: the directory contains at least one `*.md` file other than `README.md`, AND every discovered file has frontmatter, AND the framing-position rule holds for every discovered file. The second and third conditions are already enforced by the `for (const f of files) { ... }` loops below; the `'finds at least the expected prompt files'` test becomes a smoke check that the glob found files at all.
- Rename that test to `'finds at least one prompt file'` and assert `files.length >= 1`. Anything stronger is a hard-coded-list regression in disguise.
- Add a short docstring comment above `listPromptFiles()` explaining the invariant: *every non-README `.md` file under `_prompts/` is subject to the mode + framing-position checks; adding a prompt file adds test cases automatically.*

Verification: after the change, `npm run test` must show the existing per-file mode + framing-position tests still running once per prompt file, and the expected-files test replaced with a glob smoke check. Total test count may drop by one (the hard-coded `toEqual` becomes a count check) but per-file coverage is unchanged.

## Non-negotiables check (per `CLAUDE.md`)

- **Never assign untrusted content to `.innerHTML`.** ✅ — no code changes; docs only.
- **No PII or API keys in logs.** ✅ — no new log surfaces.
- **No `eval` / `new Function` / string-arg `setTimeout`.** ✅ — no code changes.
- **Runtime deps stay at zero.** ✅ — docs only.
- **Conventional commits.** ✅ — `docs:`, `chore:` as appropriate per edit.

## Data / schema impact

- `docs/data_schemas.md` gains two new sections (multi-section delimiter spec + prompt template frontmatter). Both document existing contracts; neither changes on-disk shape. Not a breaking change.
- No note-frontmatter schema changes. No SRS-YAML schema changes.

## Testing strategy

- `npm run test` — 187 tests, all must remain green. No new tests.
- `npm run lint` — clean.
- `npm run format:check` — clean.
- **Manual review per file:** each edit is prose; no automated check verifies the prose is correct. Rely on council round-1 to catch factual errors, broken cross-references, or remaining stale language.
- **No browser test required.** No code paths touched.

## Risks + mitigations

1. **Persona-edit blast radius.** Changing `.harness/council/architecture.md` changes every future architecture-axis review. *Mitigation:* the edit is narrow (swap `srs.csv` references for per-card YAML); it does not re-scope the persona's lens. Council round-1 on this PR reviews the persona with the persona's own updated text loaded, providing self-consistency check.
2. **Schema-doc drift.** Adding the delimiter spec to `data_schemas.md` risks drift from the actual parser behavior in `index.html`. *Mitigation:* the spec is a transcription of what the parser already enforces (verified against the M3 plan and the shipped code in PR #11); the prompt file in `_prompts/ingest-large-agent.md` is the producer-side transcription of the same spec. Council round-1 cross-checks consistency.
3. **Learnings append going wrong.** A wrong claim in an INSIGHT block warps downstream decisions. *Mitigation:* every claim in the reflection is backed by a specific event (PR numbers, commit SHAs, round counts) that future agents can verify. Council round-1 is the check; per CLAUDE.md anti-pattern note, this is not a `[skip council]` candidate.
4. **Scope creep.** "Documentation currency sweep" could expand to include file reorganizations, formatting sweeps, or language polish beyond the identified staleness. *Mitigation:* the Scope section enumerates exactly five edits; anything not on that list is out of scope.

## Out of scope (explicit)

- **Code changes.** No edits to `index.html`, any test file, any `/srs/` handling code, or any parser.
- **Other persona files.** `accessibility.md`, `bugs.md`, `cost.md`, `product.md`, `security.md`, `lead-architect.md`, and `repo_context.md` were audited and are current. Not in scope.
- **Reframing elsewhere.** Tier READMEs (`/bedrock/README.md`, `/warm/README.md`, `/cold/README.md`), `.harness/README.md`, `CLAUDE.md`, and all prompt files were audited and are current. Not in scope.
- **Test file rework beyond the glob conversion of Edit 6.** Any additional test-hygiene work on `tests/prompts.test.js` (e.g., adding mode-enum-range tests, adding per-prompt cost-budget assertions) is out of scope.
- **Power Automate doc updates.** Audited and found current for the Phase 3 reframe; not in scope.
- **New prompts or new tests.** Nothing new ships; only existing docs move toward truth.

## Success criteria

- `.harness/council/architecture.md` no longer references `srs.csv`; all references now describe the per-card YAML schema under `/srs/`.
- `docs/data_schemas.md` documents the `<<<LLMWIKI-SECTION:slug>>>` / `<<<LLMWIKI-SECTION-END:slug>>>` delimiter spec, 200-section cap, slug re-derivation rule, literal-sentinel escape rule, and differentiated parse-error category list — as a dedicated section with back-references to the consumer (`index.html`) and producer (`_prompts/ingest-large-agent.md`).
- `docs/data_schemas.md` documents the `mode:`, `human_turn_budget:`, and `version:` prompt-template frontmatter fields as a dedicated section.
- `CONTRIBUTING.md` no longer references `srs.csv`.
- `README.md` prompts table shows chat-mode + agent-mode siblings for every task plus the large-doc agent-only template, with human-turn-budget values verified against each prompt's frontmatter.
- `.harness/learnings.md` has a new `## 2026-04-24 — Phase 3 complete` block with KEEP / IMPROVE / INSIGHT / COUNCIL subsections.
- `tests/prompts.test.js` has no hard-coded list of expected prompt filenames; discovery is glob-based; the per-file mode + framing-position checks still run once per discovered file.
- `npm run test`, `npm run lint`, `npm run format:check` all green.
- `.harness/session_state.json` post-merge update reflects this PR's merge commit. `.harness/yolo_log.jsonl` post-merge append documents session close.

## Cost posture

- **Runtime:** $0/month (unchanged).
- **Dev-time council budget:** docs-currency + persona edit + learnings append. Docs-PR precedent (PR #12) suggests 3 rounds max; no code-surface churn expected. Target ≤3 rounds per the Phase-2 IMPROVE heuristic.
- **No new dev-time dependencies.**

## Execution order (after council approval)

1. `docs(persona): update architecture.md for per-card YAML SRS storage` — `.harness/council/architecture.md` only.
2. `docs(schema): add multi-section delimiter spec + prompt-template frontmatter section to data_schemas.md` — `docs/data_schemas.md` only.
3. `docs: drop srs.csv references from CONTRIBUTING.md in favor of per-card YAML` — `CONTRIBUTING.md` only.
4. `docs: expand README prompts table with agent-mode siblings + large-doc agent-only template` — `README.md` only.
5. `docs(harness): append Phase 3 session-close reflection to learnings.md` — `.harness/learnings.md` only.
6. `test(prompts): convert expected-files check to glob-based discovery` — `tests/prompts.test.js` only.
7. Post-merge on main: update `.harness/session_state.json` + append `.harness/yolo_log.jsonl` event (council-exempt mechanical bookkeeping).

Each commit re-runs council via `synchronize`; round-to-round changes land as additional commits, not force-pushes.
