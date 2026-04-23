# Learnings — LLMwiki-NoDep

## 2026-04-21 — Bootstrap from LLMwiki_StudyGroup

### KEEP (ported insights)
- Plan-first discipline holds under pressure; multiple independent
  reviewers converging on the same issue is a feature, not overthinking.
- Personas-as-files in git makes council output PRable, reviewable,
  citable.
- Three-tier session state (machine JSON + append-only JSONL + human
  prose) lets any agent resume without context reconstruction.
- Reflection reviews (council on learnings.md itself) catch
  mis-generalizations before they compound.
- Safety counters must live OUTSIDE the artifact they gate (GH Actions
  cache, not a repo file).
- Two-level kill switches: per-change bypass + global halt file.
- When CI is red twice from different root causes, stop pushing and
  run the full pipeline locally.
- Fail-loud-early on secrets: gitleaks scan BEFORE any LLM call.
- Institutional-knowledge content (learnings, personas, CLAUDE.md)
  routes through council regardless of diff size — leverage, not size,
  sets the bar.
- Partial writes in safety-critical paths need transactional
  semantics, not best-effort logging.

### IMPROVE (carried forward)
- None yet — this repo has no track record of its own.

### INSIGHT
- NoDep's constraint (no runtime deps, file:// execution) is a
  forcing function: every feature has to earn its DOM cost. Treat
  the constraint as an ally.

### COUNCIL
- Not yet run in this repo.

## 2026-04-21/22 — Phase 2 complete (2a through 2d + dev tooling)

### KEEP
- Single-session delivery of an entire phase series (2a–2d + dev tooling
  = 6 PRs) with council review on every PR worked well. Council caught
  real issues: WCAG contrast, non-atomic writes, UTC date bugs, PII
  leakage in Power Automate run history.
- Council's REVISE loop converges in 2–4 rounds for code PRs. Docs-only
  PRs (Phase 2d) took 5+ rounds because the Bugs persona kept finding
  edge cases in Power Automate instructions — diminishing returns.
- Escape-by-default markdown parser (zero innerHTML) survived 20+ XSS
  test cases and 3 council security reviews without a single violation.
- Deriving SM-2 repetitions from interval (avoiding a schema change)
  was the right call — exact for the three states that matter.
- README rewrite for locked-down laptops (no git, no ZIP) was critical
  user-facing work that should have been in the original plan, not an
  afterthought.

### IMPROVE
- Council Bugs persona stuck at 5–7 on docs PRs for multiple rounds
  with progressively smaller nits. Consider a "council timeout" policy:
  if approval gate says "ready" and no non-negotiable violations exist,
  merge after 3 rounds max on docs-only PRs.
- Daily review reminder flow had to be completely redesigned after
  implementation because the security persona caught PII leakage late.
  Should have flagged "any flow that reads file content" as a red line
  during plan phase, not after 3 rounds of implementation fixes.
- Test setup (extracting <script> from index.html via eval) is fragile —
  broke on Prettier reformatting. If index.html grows much larger,
  consider extracting modules to a shared .js file that both index.html
  and tests can reference (would need to verify file:// ES module support
  in Edge).

### INSIGHT
- The council's value scales with risk: code PRs (parser, writer, FS API)
  get high-value catches. Docs PRs get diminishing-returns polish. Match
  council iteration budget to PR risk level.
- Power Automate flows that read file content are a PII vector through
  run history — even if the notification output is metadata-only. "No PII
  in outputs" is insufficient; must be "no PII in processing."
- For locked-down work laptops, the installation UX IS the product.
  A perfect app that can't be installed is worth zero.

### COUNCIL
- 6 PRs reviewed, ~25 council rounds total.
- Highest-value catches: WCAG AA link contrast (3.31:1 → 5.74:1),
  non-atomic write pattern, toISOString().slice(0,10) UTC date bug,
  PII in Power Automate run history, missing stale-write detection.
- Lowest-value rounds: repeated Bugs findings on Power Automate
  documentation edge cases (pagination, conflict-file filter specificity).

## 2026-04-22 — Phase 3 Milestone 1: personal corpus reframe (PR #7)

### KEEP
- Plan-first discipline held through a product-persona veto. Council
  round 1 flagged the user's "our corpus" / team-use framing as an
  anti-scope violation (Product score 2, single blocker). No code was
  written; the plan was revised in place. Five council rounds later
  (4 on the plan, 1 on the implementation diff) converged to
  10-across-the-board with zero rework. Up-front cost paid in full.
- Multi-PR milestones in one active_plan.md is a clean pattern: the
  plan is the contract, each PR updates the status block without
  rewriting the body. Avoids three separate plan PRs fighting for
  council capacity on the same arc.
- When a council persona blocks on scope, surface 2–3 concrete paths
  to the human (accept narrower scope / change persona / override
  council) rather than picking for them. The human has final say on
  product direction; the agent's job is to present choices, not make
  them.
- A parser-security pushback can produce a SIMPLER spec, not a more
  complex one. Round 1 Bugs persona flagged quote-escaping in the
  delimiter's `title="..."` attribute; rev 2 moved metadata into
  per-section YAML frontmatter and reduced the sentinel to a
  slug-only marker. Whole class of edge cases dissolved via structural
  simplification rather than added validation.

### IMPROVE
- When the user's direction sounds like it might cross a known
  anti-scope, briefly cite the anti-scope to the user BEFORE writing
  the plan, not after. "Our corpus" was ambiguous enough that round 1
  could have been avoided with a one-line pre-flight: "I read `our` as
  team — Product anti-scope is single-user-only; do you mean shared
  access, or a single-user personal corpus?" Council budget saved;
  user's intent clarified earlier.
- Rev 4 (two implementation-level refinements baked into the plan
  post-approval) cost one extra council round. Worth it for approval-
  gate integrity against the final SHA, but for smaller refinements
  consider treating them as Milestone-3 execution details and capturing
  them in a TODO comment on the plan rather than a new revision.
- Bugs persona converged over three plan rounds (7 → 8 → 9 → 10), each
  surfacing real edge cases. Pre-emptively front-loading known bug
  classes from prior phases' learnings (async/race, encoding/escaping,
  resource-exhaustion, state-staleness) would have compressed this.
  Keep a running "Bugs-persona pattern library" cross-referenced in
  plan-drafting.

### INSIGHT
- Approval-gate strictness (plan committed at SHA + council synthesis
  against that SHA + explicit human approval — all three, always)
  produces a plan that ships cleanly. Round 5 (implementation review)
  scored 10 across the board with zero rework requested. The discipline
  works when followed; skipping any of the three conditions is where
  past repos burned themselves.
- Product persona is the most leverage-dense of the six. A product
  veto can save a month of wrong-direction implementation; the other
  personas' catches are usually recoverable on the day of writing. If
  a plan touches product framing (mission, audience, anti-scope), read
  `.harness/council/product.md` before drafting, not after.
- Single-user anti-scope is load-bearing in this repo. Even language
  that sounds collaborative ("our corpus," "shared access") is routed
  through a single-user framing unless the persona file is deliberately
  changed. This is not accidental — it defines the product.

### COUNCIL
- 5 rounds on PR #7 (4 plan, 1 implementation). Score trajectory:
  - R1: a11y 8, arch 10, bugs 7, cost 9, product 2, security 9 → Revise (product blocker)
  - R2: a11y 9, arch 10, bugs 8, cost 10, product 10, security 9 → Revise (2 bugs blockers)
  - R3: a11y 9, arch 10, bugs 9, cost 10, product 10, security 10 → Proceed
  - R4: a11y 9, arch 10, bugs 9, cost 10, product 10, security 10 → Proceed
  - R5 (impl): a11y 9, arch 10, bugs 10, cost 10, product 10, security 10 → Proceed
- Highest-leverage catches: (1) Product anti-scope veto on team framing,
  (2) Bugs-persona flag on delimiter quote-escaping that drove the
  spec simplification, (3) Bugs-persona flags on UI scale + stale
  collision check that produced the 200-section cap and pre-commit
  re-scan, (4) Security-persona ESLint DOM-sink ban nice-to-have that
  the human promoted to plan-level commitment.
- Month-to-date council budget: ~5 of 60 runs used. Well within cap.

## 2026-04-22/23 — Phase 3 M2 (dual-mode prompts) + council persona hallucination fix

### KEEP
- Agent-mode prompts benefit from a small number of focused subagents
  with explicit per-subagent I/O contracts, NOT a big orchestration
  monster. Linker used 2 subagents (match-scanner + wrap-applier);
  review-packet used 5 (one per output section). Both felt right.
  Matching subagent count to the natural decomposition of the task
  matters more than hitting a "standard" count.
- Per-subagent untrusted-content framing caught real drift during
  development: writing the Vitest framing-position check BEFORE the
  prompts were done would have caught both bugs in my own draft agent
  prompts faster. The test IS the enforcement. Use test-first discipline
  for any security-sensitive prompt pattern in future milestones.
- When the council critique is demonstrably wrong (references files
  that do not exist, demands features already present, re-raises
  explicitly-declined scope), document the override with specific
  evidence — what the council claimed vs. what the diff actually
  contains — and merge. The override mechanism is cheap; re-litigating
  a hallucinated review burns budget and slows real work.

### IMPROVE
- Before writing a Vitest test that walks markdown structure, think
  through the whole-line-vs-substring distinction AND the blank-line
  skip-back. My first test used `line.includes(marker)` and matched
  the framing paragraph's own mention of the marker text. Second
  iteration missed that code-fence openers (```) should be skipped
  along with blank lines. Three iterations to converge. Next time:
  write the "what counts as a content line" predicate first, then the
  marker-scanner, then the assertion.
- Two consecutive council runs (PR #8 session-close, PR #9 Milestone 2)
  returned Revise based on hallucinated stack (Vue + TS + pnpm + `src/`
  directories that do not exist). Root cause: persona files and the
  Lead Architect prompt lack an explicit repo-context anchor, so on
  text-heavy diffs Gemini fills in the gap with whatever web-stack
  defaults are most frequent in its priors. Fix lands in this same
  session via `.harness/council/repo_context.md` + `council.py`
  injection.

### INSIGHT
- Council hallucinations are **stack-agnostic in both directions** —
  the same Gemini model that accurately reviewed code-bearing PRs
  (Phase 2b, 2c) fabricates frameworks when the diff is predominantly
  text (prompt templates, learnings, harness bookkeeping). The grounding
  anchor is the fix, not a persona-file rewrite. Infrastructure change
  beats persona tuning here.
- Cost and Security personas stayed accurate across both hallucinated
  rounds (10/10 on both PR #8 and PR #9 when the others went sideways).
  Hypothesis: these two personas' scopes are concrete and bounded
  (cost = human turns on GenAI.mil; security = untrusted-content
  handling, injection, PII), so there is less surface area for
  hallucination to colonize. The structural personas (arch, bugs,
  product, a11y) have broader scope that invites speculative
  architecture inference when the diff doesn't constrain it.
- Two overrides in a row in this session. The override mechanism is
  necessary, but its frequency is a signal — the harness needs to
  prevent the situation, not rely on the escape hatch. Hence the
  repo-context anchor. If the anchor doesn't reduce hallucination
  frequency materially over the next few PRs, the next lever is
  persona-file tuning (tighter scope definitions, explicit "do NOT
  propose changes outside this list" guardrails).

### COUNCIL
- PR #7 (Milestone 1): 5 rounds total, final 10-across-the-board Proceed.
- PR #8 (session close for M1): 1 round, Revise, hallucinated Vue/TS.
  Overridden — critique cited files that do not exist.
- PR #9 (Milestone 2): 1 round, Revise, hallucinated Vue/pnpm/`src/lib/`.
  Overridden — critique cited files that do not exist + demanded i18n
  (explicitly declined in plan rev 3) + demanded features already in
  the diff.
- Month-to-date council budget: ~7 of ~60 runs used across this session.

## 2026-04-23 — Council persona hallucination fix (this session, continued)

### KEEP
- Root-causing the hallucination pattern to "persona prompt lacks
  repo-context anchor" before attempting persona-level tuning was the
  right call. Infrastructure fix (one file + 4-line council.py change)
  addresses every persona at once; a persona-by-persona rewrite would
  have been 7x the work and still wouldn't have caught what we can't
  anticipate.
- Keeping the anchor as a SEPARATE file (`repo_context.md`) injected
  by the runner, rather than editing each persona file, means the next
  stack change (e.g., if Phase 4 ever adopts a dev-only framework for
  tests) is a one-file edit, not a 7-file sync.

### IMPROVE
- (Open observation for next session.) If the repo-context anchor
  reduces hallucination rate on the next 3-5 council runs, the
  pattern is validated. If it doesn't, escalate to persona-file
  tuning — specifically, add "do NOT invent file paths not in the
  provided repo context" guardrails to arch / bugs / product / a11y.

### INSIGHT
- Fixing the council infrastructure IS itself council-gated per
  CLAUDE.md (persona file edits + changes to council.py). If this
  PR's council round hallucinates again, the override justification
  is built in: a council that says "do not fix the council" on a
  diff that consists of "fix the council" is empirically proving
  the need for the fix.

### COUNCIL
- (To be filled after this PR runs.)

## 2026-04-23 — Phase 3 Milestone 3 (large-doc chunked ingest) — complete

### KEEP
- Splitting the M3 implementation into one CI-observable increment per
  logical layer (ESLint guardrail → Slugger → SectionDelimiterParser →
  security tests → UI scaffold → writer) kept each commit bounded to
  ~300-700 LoC and each council round focused. 13 total rounds on
  this PR; score movement was most dramatic in the first three rounds
  as the aria-live and error-path redaction commitments compounded.
- Installing the ESLint DOM-injection-sink ban FIRST (before writing
  any parser or UI code) meant every subsequent commit was
  mechanically guarded against regression. The rule never fired on
  my diffs — but its existence during development is what made me
  reach for `createElement + textContent` without thinking about it.
  That is the guardrail doing its job.
- Writing the security test battery (XSS-split-across-boundaries,
  exhaustive redaction, fuzz-mixed-XSS) as a dedicated commit before
  touching the writer surface kept the review focused and earned
  10/10 security scores across every subsequent round.
- The test harness earned its keep on rev 11. Council flagged a
  data-corruption risk in `_atomicWrite`; I wrote the fix AND a test
  asserting the `.tmp` is preserved on unrecoverable verify failure;
  the test FAILED, revealing a bug in my fix (the outer catch was
  wiping `.tmp` unconditionally). Test-first for safety-critical
  code paid off — I would have shipped the broken fix otherwise.

### IMPROVE
- Reproduce the user's reported-bug input verbatim in a test case
  BEFORE claiming a fix is done. The mixed-indent UX bug required
  three commits (sentinel-trim, frontmatter-trim, polish) because
  my first fix only handled sentinel lines and I didn't exercise
  the full pipeline against the real paste. If I had copied the
  user's console.log output directly into a test and fixed until
  that test passed, one commit would have done it. Signal: a
  fix-up commit landing within 30 min of the original fix is a
  test-coverage gap.
- UI changes are not testable from this agent context. The writer
  commit included a 12-point manual-test checklist but I couldn't
  execute any of it — the user did. The mixed-indent bug survived
  to the user because I claimed "tests pass; ship" without admitting
  the UI-side paths were entirely un-tested from my seat. Going
  forward: UI commits should treat "I cannot test this" as a
  load-bearing caveat, not a footnote.
- The council's Lead Architect synthesis drifts into "merge the PR
  as-is" when the diff is small but the PR history is long.
  Rounds 5, 6, 10, 11, 13 all had a "merge this now" step even
  when large chunks of functionality were still outstanding. The
  persona raw critiques are always accurate; the compression into
  a 7-step synthesis is where drift happens. Counter: trust the
  raw critiques over the synthesis for scope decisions.

### INSIGHT
- The repo-context anchor (PR #10) held across 13 rounds of review
  with ZERO stack-hallucinations. Compare to the 2 consecutive
  hallucinated Revises on PRs #8 and #9 in the previous session.
  One-file infrastructure fix → effectively 100% reduction in the
  failure pattern it targeted. Clearest win for "fix the harness,
  not the symptom" in this project's history so far.
- A new failure mode emerged mid-session (rounds 4-6) that the
  anchor doesn't address: the council sometimes treats the PLAN
  as the implementation, producing "merge the PR" synthesis steps
  when real code is still outstanding. Not a hallucination — the
  persona critiques correctly identify deferred items — but the
  synthesis compresses. A follow-up anchor for "this PR is at
  commit N of M milestones" might help; parked for now.
- Round 12 was the first Revise after 10 consecutive Proceeds. The
  cadence of clean Proceeds can become a trap — I started merging
  polish items into larger commits because "council always approves
  anyway." Round 12 caught a real data-corruption risk in
  `_ingestSerializeYamlValue` that I had written from scratch
  without thinking through FrontmatterParser's reader semantics.
  The trap: writer-reader mismatches survive every test that
  uses the writer OR the reader but never both in round-trip.
  Lesson: serializer tests MUST round-trip through the paired
  parser.
- Cost posture: 13 council rounds × ~7 Gemini calls each ≈ 91
  calls on this PR alone. The plan budgeted 3-5 rounds. Overrun
  came from: 2 fix-up rounds for the mixed-indent UX bug, 1
  Revise-then-fix for data corruption, 1 Revise-then-fix for
  serializer/guards/recovery, ~4 polish-commit cycles. Future
  UI-heavy milestones should budget 2-3 manual-testing fix-up
  rounds as a separate line item so "3-5 rounds" isn't a plan
  violation every time.

### COUNCIL
- 13 rounds on PR #11. Decisions: 11 Proceed, 2 Revise (R11 for
  atomic-write verify gap in inherited Phase-2 code; R12 for
  serializer newline safety + regen-index guard + revoked-handle
  recovery flow).
- Zero stack hallucinations across all 13 rounds. Repo-context
  anchor (PR #10) validated on a mixed code + prose PR of ~4000
  line additions.
- Highest-leverage catches: (a) round 1 exhaustive error-path
  redaction must-do drove the 18-case redaction test battery;
  (b) round 10 `listTierFilenames` error-discrimination catch on
  inherited Phase-2 code that would have silently allowed
  overwrites on revoked folders; (c) round 11 atomic-write verify
  gap on inherited Phase-2 code that could have silently
  corrupted files on mid-write crash; (d) round 12 serializer
  newline bug in code I wrote from scratch, caught by a
  reader-aware test the bugs persona asked for.
- Month-to-date council budget: ~91 of ~60 runs used. Overrun
  source documented in IMPROVE; not attributable to council
  inefficiency.

## 2026-04-24 — Phase 3 complete (M1 + M2 + M3 + docs-gap closure + currency sweep)

### KEEP
- Council's repo-context anchor (PR #10) eliminated stack
  hallucinations across the M3 code-bearing PR (13 rounds, zero
  hallucinations) and the M3 docs-gap PR #12 (3 rounds, zero
  hallucinations). The anchor is the most leveraged piece of
  council infrastructure in the repo — three-paragraph file,
  loaded into every review, every persona gets the same ground
  truth. Pattern worth naming: "load-bearing preamble," preventing
  stack hallucination from text-heavy diffs.
- Docs-PR council iteration discipline held on both follow-ups:
  PR #12 merged after round 3 of Proceed and PR #13 merged after
  round 3 (one Revise → round 3 Proceed) rather than chasing
  round-4+ rotating score-9 refinements from the bugs persona.
  Validates the Phase-2 IMPROVE note ("merge after 3 rounds max
  on docs-only PRs") a second and third time.
- Plan-first, council-gated, human-approved, then execute — all
  four Phase-3 milestones landed with this discipline and zero
  incidents. The prime directive is load-bearing, not ceremonial.
- Four prompt-hardening passes on PR #12's `ingest-large-agent.md`
  (double-sided sentinel escape + URL scheme guard + `---`
  body-line handling + invalid-subagent-output critical failure +
  ASCII-only frontmatter + NUL-byte stripping + empty-section
  placeholder) demonstrate defense-in-depth at the prompt layer
  for surfaces where the parser is the hard backstop. The repo's
  convention of "prompt is soft defense; parser is hard defense"
  scales.
- Codex P2 inline review on PR #13 rev 1 caught two concrete
  plan-accuracy bugs council's round-1 reviewers missed:
  required-vs-optional SRS field confusion, and a wrong
  parser-error-category name. Gemini council reviews the
  architectural shape; Codex reviews the specific token-level
  claims. Both are complementary; running both on institutional-
  knowledge PRs is worth the review latency.
- The Import view's delimiter format is now documented in BOTH
  `docs/data_schemas.md` (contract, post-PR-#13) and
  `_prompts/ingest-large-agent.md` (producer instructions) — the
  right redundancy. Future agents discover the spec whether they
  start from schema-hunting or prompt-hunting.

### IMPROVE
- The M2 plan committed to adding a "Prompt template frontmatter"
  section to `docs/data_schemas.md` and the M3 plan committed to
  documenting the delimiter spec there. Neither landed with the
  milestone it belonged to. Both landed in PR #13 as part of the
  docs-currency sweep, which is how these kinds of deferred-
  schema-doc deliverables typically close, but the cleaner
  pattern is to include schema-doc edits in the originating
  milestone's "Execution order" checklist so they cannot slip
  silently. Fold "schema doc updated" into the pre-merge
  checklist for any PR that adds a new parseable format.
- The architecture persona (`.harness/council/architecture.md`)
  was written in Phase 1 against the then-proposed `srs.csv`
  storage model. Phase 2c switched to one-file-per-card YAML
  (correctly reflected in `repo_context.md`) but the persona was
  never updated. Persona drift is a compounding blast-radius bug
  — every future architecture-axis review runs against a wrong
  mental model. Fixed in PR #13 Edit 1. Lesson: when the stack
  changes, persona files are first-class update targets, not
  optional polish. Add a persona-currency check to the pre-merge
  checklist for any PR that touches the storage layer, routing
  layer, or schema.
- Docs-gap debt from a code-focused milestone is predictable:
  when the agent is heads-down on code + tests + security, the
  producer-side prompt and user-facing README typically slip. We
  closed M3's docs gap as a dedicated follow-up PR (#12) rather
  than fold it into PR #11. That worked but introduced a session
  gap where the feature was unreachable end-to-end. Next time a
  code-bearing milestone ships a new producer/consumer pair, try
  carving the producer-side prompt and user-facing README into
  the SAME PR as the consumer-side parser. If that's too much
  PR scope, explicitly frame the docs PR as the milestone's
  closing deliverable (not as a next-session task) so no ship
  lag exists.
- The `tests/prompts.test.js` expected-files list was hard-coded.
  Every new prompt file required a one-line mechanical update.
  Council round-1 on PR #13 asked that the fix land in that PR
  rather than get deferred — a deferred test-hygiene IMPROVE
  becomes a trap for the next prompt author. Addressed as Edit 6
  of PR #13 with a Vitest snapshot test (council round-2 blocked
  an earlier `files.length >= 1` approach as a coverage
  regression). Lesson for future PRs: when the reflection
  identifies a concrete test-hygiene issue, fold the fix into
  the same PR unless there is a specific reason it can't land.
  "Deferred to follow-up" is not free — it creates trap-ness
  that accumulates across sessions.
- Codex bot review does not auto-re-review on push. PR #13 Codex
  P2 comments were against plan rev 1; rev 2 addressed them but
  Codex never re-reviewed, leaving the P2 badges visible on
  stale content. Low-cost mitigation: drop a "@codex review"
  comment after a significant plan revision, or accept that
  Codex is effectively a one-shot reviewer at PR-open time.

### INSIGHT
- Council persona compounding-leverage asymmetry. A single
  persona file defines the lens every future architecture-axis
  review uses. One wrong line (e.g., "CSV schema stability")
  propagates into thousands of future decisions. Compare to a
  single wrong line in a README, which is discoverable to one
  user at one moment. The persona files deserve the same
  editorial discipline as schema contracts — arguably more,
  because schema contracts have tests guarding them and persona
  contracts do not.
- Bugs-persona rotating refinements on docs PRs follow a
  pattern: round N finds category X (encoding, escaping,
  error-handling), round N+1 finds category Y, round N+2 finds
  category Z. Each is individually defensible; collectively
  they're a bucket-brigade of nice-to-haves. The kill-round
  policy is the right response — not because the bugs persona
  is wrong but because marginal defense-in-depth at round 4
  costs more than the defense is worth on docs content. The
  persona is working as intended; the rate-limiter lives at the
  human-approval layer.
- The repo-context anchor's design pattern — a short,
  authoritative "this is the stack" preamble injected into every
  LLM call that reviews the code — generalizes to other meta-AI
  tools in other repos. Worth naming: the pattern is
  "load-bearing preamble" and the failure mode it prevents is
  "stack hallucination from text-heavy diffs." Useful to port
  if/when this harness is reused.
- Single-user anti-scope discipline survived four milestones of
  pressure from the product persona. Every milestone saw
  product-persona probing for "team," "shared," or "multi-user"
  surface area; every milestone held the line. Explicit
  anti-scope in CLAUDE.md + plan bodies works when the human is
  disciplined about re-affirming it during council reviews.
- Complementary review systems catch different classes of bug.
  Council (Gemini, architectural critique) + Codex (OpenAI,
  token-level accuracy check) caught strictly disjoint issues on
  PR #13: council caught the test-coverage regression and the
  parser-vs-validation contract gap; Codex caught the wrong
  required-fields list and the wrong error-category name. Each
  missed what the other caught. The cost of running both is
  lower than the cost of shipping either class of bug into
  institutional knowledge.

### COUNCIL
- PR #7 (M1) round 1: product persona (score 2 / blocker) vetoed
  "team / shared corpus" framing as anti-scope violation.
  Reframe to "single-user personal reference corpus" was the
  right response. Product-persona as anti-scope guardian is
  working.
- PR #9 (M2) round 1: council hallucinated a Vue / pnpm /
  `src/lib/` stack against a pure-markdown diff. Override-merged
  on evidence; root-cause-fixed in PR #10 via the repo-context
  anchor. The `override council:` escape hatch is reserved for
  exactly this class of failure and should not be expanded.
- PR #11 (M3) rounds 1–13: 11 Proceed, 2 Revise, zero
  hallucinations. Rev 2 Revise caught collision-check staleness
  (pre-commit rescan added). Rev 12 Revise caught serializer
  newline-safety edge cases. Both were legitimate catches that a
  scoped anchor could not preempt.
- PR #12 (docs-gap) rounds 1–3: all Proceed, zero
  non-negotiables, bugs-persona rotated score-9 items each
  round. Validated the 3-round-kill heuristic on docs PRs.
- PR #13 (docs-currency + reflection) rounds 1–3: Proceed /
  Revise / Proceed. Round-2 Revise was a real test-coverage
  regression blocker (council caught a concrete bug I
  introduced in rev 2). Round-3 rotated to low-priority
  nice-to-haves. Merged after round 3.

**Counter to Phase 2 note on test extraction from `index.html`:**
the Phase 2 IMPROVE proposed extracting modules from
`index.html` to shared `.js` files if the file grew much
larger. `index.html` is now 5,885 lines (Phase 3 M3 added ~1,000
lines). The test-extract-via-eval pattern still holds; no
extraction has been necessary. The note's threshold ("if
`index.html` grows much larger") has been crossed and the
extraction was still not the right call. **Revised trigger:**
revisit extraction if — and only if — tests fail on changes
that don't touch the code they cover (e.g., a Prettier-reformat
of unrelated `index.html` code breaks an unrelated test's
eval-parse step), and the failure happens more than once per
milestone. File-length alone is not a sufficient trigger;
brittleness — measured as failure correlation with unrelated
edits — is. As of this session, that threshold has not been
crossed; keep the eval-extract pattern.

**Counter to Phase 2c note on council-round budgets:** the
Phase 2c IMPROVE observed that code-heavy milestones run
longer than "3-5 rounds" and recommended budgeting 2-3 fix-up
rounds separately. PR #13's 3-round close (including one
Revise-and-fix) confirms that docs-only PRs can still hit the
3-round heuristic with a Revise folded in, provided the Revise
is a specific, scoped blocker rather than a general concern.
Keep the 3-round docs heuristic; keep the Phase-2c observation
that code PRs budget separately for fix-up rounds.
