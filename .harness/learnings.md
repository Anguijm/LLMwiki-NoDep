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
