# `/warm/` — active learning

Notes in this folder are the material you're actively studying. They drive the SRS review queue, are the default target for `/_prompts/flashcards.md`, and are where new `[[wiki links]]` get formed as you integrate a new concept with what you already know.

## What belongs here

- Current-semester coursework (textbook chapters, lecture transcripts, derivations you're working through).
- Concepts that have active SRS cards under `/srs/`.
- Work-in-progress derivations you haven't fully verified.
- Notes created in the last 4–6 weeks that haven't yet earned promotion or archival.

## What does NOT belong here

- Permanent reference material (that's `/bedrock/`).
- Material from a course you finished and won't return to (that's `/cold/`).
- Source files (PDFs, .docx). Put those outside the repo; only the distilled markdown notes belong in `/warm/`.

## Frontmatter

Every note in this folder carries `tier: warm` in frontmatter. Full schema in `/docs/data_schemas.md`.

```yaml
---
title: Kirchhoff's voltage law — worked example
tier: warm
created: 2026-04-18T11:03:00Z
updated: 2026-04-21T09:45:00Z
tags: [circuits, kvl, worked-examples]
sources: [https://course.example.edu/ee101/lec07.pdf]
---
```

## Lifecycle: moving notes in and out

- **In** (new note): created by `/_prompts/ingest.md` from a pasted source, or written by hand. Frontmatter `tier: warm` set on creation.
- **`warm` → `bedrock`:** a note earns promotion when it has survived 2–3 SRS review cycles at ease ≥ 2.8 without edits. Move the file, update `tier:` in frontmatter, bump `updated:`.
- **`warm` → `cold`:** a note is archived when the course is finished, the project is done, or you've stopped reaching for it. Move the file, update `tier:`, bump `updated:`. Optionally delete its SRS cards from `/srs/` (or leave them at a long interval — SM-2 naturally decays attention to old cards).
- **`warm` → `warm` (same tier):** edit in place when you're refining the note. Bump `updated:` on every substantive content change.

## Phase 2b interaction

The graph view in Phase 2b renders `/warm/` notes by default. This folder is the center of daily use: add notes here, generate SRS cards here, run `gap-analysis.md` against a `/warm/` subset when you need to find contradictions before an exam.
