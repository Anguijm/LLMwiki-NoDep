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
