# `/bedrock/` — permanent reference

Notes in this folder are the permanent, slow-changing substrate of your knowledge. They are always loaded into the graph view on app open and are the default source for `[[wiki links]]` that don't specify a tier.

## What belongs here

- First-principles derivations you'll reach for years from now (e.g., Laplace transform tables, Fourier series identities, SI unit prefixes).
- Canonical definitions and axioms for core subjects.
- Reference tables you consult without re-reading the derivation every time.
- Textbook chapter distillations after they've survived multiple review cycles in `/warm/`.

## What does NOT belong here

- Anything you're actively learning this semester (that's `/warm/`).
- Material you've finished a course on and won't reach for again (that's `/cold/`).
- Personal notes, meeting notes, TODO lists (not a study-wiki concern).
- Work-in-progress derivations you haven't sanity-checked (that's `/warm/`).

## Frontmatter

Every note in this folder carries `tier: bedrock` in frontmatter. Full schema in `/docs/data_schemas.md`.

```yaml
---
title: Laplace transform — pair table
tier: bedrock
created: 2026-03-15T09:12:00Z
updated: 2026-04-02T14:40:00Z
tags: [laplace-transforms, signals, reference]
---
```

## Lifecycle: moving notes in and out

- `warm` → `bedrock`: after a note has survived 2–3 SRS review cycles at ease ≥ 2.8 without edits to the core content, it has earned promotion. Move the file to `/bedrock/`, update `tier:` in frontmatter, bump `updated:`.
- `bedrock` → `warm`: if the note contains an error you need to re-derive, or a new source requires significant revision. Demote and put it through the review loop again.
- `bedrock` → `cold`: never, as a rule. Bedrock content is permanent or wrong — if it's wrong, it gets fixed in place, not archived.

## Phase 2b interaction

The graph view in Phase 2b always renders `/bedrock/` notes. Filter toggles hide `/warm/` and `/cold/`, but `/bedrock/` stays visible — it's the backbone.
