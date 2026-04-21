# `/cold/` — archived

Notes in this folder are archived: finished coursework, old projects, material you no longer actively review but want to preserve for future reference. `/cold/` is searchable but not auto-loaded into the graph view in Phase 2b — the app stays fast even as this folder grows to hundreds of notes.

## What belongs here

- Notes from courses you've completed and passed.
- Old project notes you might reach for once a year but not weekly.
- Derivations you've internalized well enough that active review doesn't help anymore, but want to retain for cross-reference.
- Material superseded by a bedrock note (keep the history, reference via `[[links]]` if needed).

## What does NOT belong here

- Active learning material (that's `/warm/`).
- Permanent reference (that's `/bedrock/`).
- Anything you would not notice disappearing — if a note has truly zero future value, delete it. `/cold/` is for preservation, not accumulation.

## Frontmatter

Every note in this folder carries `tier: cold` in frontmatter. Full schema in `/docs/data_schemas.md`.

```yaml
---
title: ME 311 — statics final exam review packet
tier: cold
created: 2025-12-10T18:00:00Z
updated: 2026-01-06T22:14:00Z
tags: [me-311, statics, exam-prep, archived]
---
```

## Lifecycle: moving notes in and out

- `warm` → `cold`: a note is archived when its course / project is finished and you've stopped reviewing it. Update `tier:`, bump `updated:`.
- `cold` → `warm`: a note is "unarchived" when you need to actively re-learn the material (preparing for a follow-on exam, revisiting an old project). Move the file, update `tier:`, bump `updated:`.
- `cold` → `/bedrock/`: rare but possible — a cold note that turns out to be foundational enough to earn promotion. Typically goes `cold` → `warm` → `bedrock` via a review pass, not directly.

## Phase 2b interaction

The graph view filter hides `/cold/` by default. You can toggle the filter to include `/cold/` when you need cross-tier visibility. Full-text search always includes `/cold/`. The `/_index.md` regeneration includes `/cold/` notes on the same footing as any other tier — nothing is hidden from the index, only from the default graph render.
