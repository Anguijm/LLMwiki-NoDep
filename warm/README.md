# `/warm/` — active reference (default landing tier)

Notes in this folder are the **active layer** of your personal reference corpus. This is the **default landing tier** for new material ingested from a source — use `/warm/` unless one of the other tiers is clearly justified.

## What belongs here

- New material you've just ingested (default location; promote later if it earns it).
- Procedures, manuals, or guidance you consult regularly but which may still be revised.
- Reference notes you're in the middle of refining, cross-linking, or validating.
- Notes with active SRS cards under `/srs/` (the retention layer is optional and sits on top of whatever tier the note lives in).

## What does NOT belong here

- Durable, invariant reference material you reach for repeatedly without expecting changes (that's `/bedrock/`).
- Material you no longer consult routinely and want archived but still searchable (that's `/cold/`).
- Source files (PDFs, .docx, .pptx). Put those outside the corpus; only the distilled markdown notes belong in `/warm/`.

## Frontmatter

Every note in this folder carries `tier: warm` in frontmatter. Full schema in `/docs/data_schemas.md`.

```yaml
---
title: Acceptable use policy — summary
tier: warm
created: 2026-04-18T11:03:00Z
updated: 2026-04-21T09:45:00Z
tags: [policy, acceptable-use, reference]
sources: [https://intranet.example/policies/aup.pdf]
---
```

## Lifecycle: moving notes in and out

Because `/warm/` is the default landing tier, the common motion is "stays in `/warm/`." Promotion and archival are **exceptions**, not the default. Err on the side of leaving a note in `/warm/` unless you have a specific reason to move it.

- **In** (new material): created by `/_prompts/ingest.md` from a pasted source, or written by hand. Frontmatter `tier: warm` set on creation.
- **`warm` → `bedrock`:** a note earns promotion when (a) it has been stable for an extended period without content edits, and (b) you find yourself reaching for it repeatedly and expect to keep doing so. Durability + reuse frequency, not review cycles. Move the file, update `tier:` in frontmatter, bump `updated:`.
- **`warm` → `cold`:** a note is archived when you no longer consult it routinely but want it preserved and searchable. Move the file, update `tier:`, bump `updated:`. Optionally delete any SRS cards under `/srs/` referencing the note, or leave them at a long interval — SM-2 naturally decays attention to old cards.
- **`warm` → `warm`:** edit in place when you're refining the note. Bump `updated:` on every substantive content change.

## Phase 2b interaction

The graph view renders `/warm/` notes by default. This folder is the center of daily use: add notes here, generate retention cards here, run `gap-analysis.md` against a `/warm/` subset when you want to surface contradictions or holes before relying on the material.
