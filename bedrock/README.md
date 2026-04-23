# `/bedrock/` — permanent reference

Notes in this folder are the **durable, invariant substrate** of your personal reference corpus. They are always loaded into the graph view on app open and are the default source for `[[wiki links]]` that don't specify a tier.

`/bedrock/` is a **high bar**: use it only when a note is genuinely stable reference material you expect to reach for repeatedly without revision. When in doubt, leave it in `/warm/`.

## What belongs here

- Canonical definitions, reference tables, and invariant rules you consult without re-reading the derivation every time.
- Foundational documents whose content rarely changes (core policies, standing procedures, reference constants).
- Distillations of source material after they've proven durable in `/warm/` — stable content plus demonstrated reuse frequency.

## What does NOT belong here

- Anything you're still actively refining, cross-linking, or validating (that's `/warm/`).
- Material you've stopped consulting routinely (that's `/cold/`).
- Notes whose underlying source is expected to be revised (e.g., policies with a known update cadence) — keep those in `/warm/` until their content stabilizes.
- Meeting notes, task lists, ephemeral artifacts (not a corpus concern).

## Frontmatter

Every note in this folder carries `tier: bedrock` in frontmatter. Full schema in `/docs/data_schemas.md`.

```yaml
---
title: Personnel security standards — reference
tier: bedrock
created: 2026-03-15T09:12:00Z
updated: 2026-04-02T14:40:00Z
tags: [personnel-security, standards, reference]
---
```

## Lifecycle: moving notes in and out

- `warm` → `bedrock`: a note earns promotion after it has been content-stable for an extended period and you find yourself reaching for it repeatedly. Durability + reuse frequency, not review cycles. Move the file to `/bedrock/`, update `tier:` in frontmatter, bump `updated:`.
- `bedrock` → `warm`: if the note contains an error that needs re-verification, or if the underlying source has been revised enough to require substantial edits. Demote back to `/warm/` until the content is stable again.
- `bedrock` → `cold`: avoid. Bedrock content is either maintained in place or demoted to `/warm/` for revision. Archiving invariant reference is usually a sign that the note belonged in `/warm/` all along.

## Phase 2b interaction

The graph view in Phase 2b always renders `/bedrock/` notes. Filter toggles hide `/warm/` and `/cold/`, but `/bedrock/` stays visible — it's the backbone.
