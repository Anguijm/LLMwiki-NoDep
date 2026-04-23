# `/cold/` — archived

Notes in this folder are archived: material you no longer consult routinely but want to preserve and keep searchable. `/cold/` is searchable but not auto-loaded into the graph view in Phase 2b — the app stays fast even as this folder grows to hundreds of notes.

## What belongs here

- Reference material from a role, project, or context you've moved on from but want to retain.
- Superseded versions of notes, preserved for cross-reference (keep the history; the current version lives in `/warm/` or `/bedrock/`).
- Material you might consult once in a while but not as part of daily reference work.
- Notes that used to be in `/warm/` but have stopped earning their place in the active layer.

## What does NOT belong here

- Active reference material (that's `/warm/` — the default landing tier for new material).
- Durable, invariant reference (that's `/bedrock/`).
- Anything you would not notice disappearing — if a note has truly zero future value, delete it. `/cold/` is for preservation, not accumulation.

## Frontmatter

Every note in this folder carries `tier: cold` in frontmatter. Full schema in `/docs/data_schemas.md`.

```yaml
---
title: Legacy onboarding checklist — 2024 revision
tier: cold
created: 2025-12-10T18:00:00Z
updated: 2026-01-06T22:14:00Z
tags: [onboarding, legacy, archived]
---
```

## Lifecycle: moving notes in and out

- `warm` → `cold`: a note is archived when you've stopped consulting it routinely. Update `tier:`, bump `updated:`.
- `cold` → `warm`: a note is "unarchived" when you need it back in active reference — the role or project has come back into focus, or the material is suddenly relevant again. Move the file, update `tier:`, bump `updated:`.
- `cold` → `/bedrock/`: rare. A cold note that turns out to be foundational usually takes the path `cold` → `warm` → `bedrock`, with a review pass in `/warm/` to confirm the content is still accurate before promoting.

## Phase 2b interaction

The graph view filter hides `/cold/` by default. You can toggle the filter to include `/cold/` when you need cross-tier visibility. Full-text search always includes `/cold/`. The `/_index.md` regeneration includes `/cold/` notes on the same footing as any other tier — nothing is hidden from the index, only from the default graph render.
