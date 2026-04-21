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
