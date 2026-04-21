# LLMwiki-NoDep

A zero-dependency, static-file personal study wiki. Runs from a SharePoint-synced folder opened directly in Microsoft Edge via `file://`. No server, no build step, no runtime API calls, no CDN. All "AI" is a human copy/paste loop against GenAI.mil.

Built for a specific workflow: a locked-down work laptop, a single engineer-user, SharePoint sync as the storage layer, manual prompts as the AI layer.

## Status

- **Phase 1** (council harness): merged.
- **Phase 2a** (folder structure + prompt templates + schema docs + empty SRS folder): this branch.
- **Phase 2b** (`index.html` + inline markdown parser + wiki-link resolver + `_index.md` regenerator): not yet started.
- **Phase 2c** (graph canvas + SRS review mode): not yet started.
- **Phase 2d** (Power Automate flow docs): not yet started.

Until Phase 2b lands, this repo is a **markdown-only, read-in-your-editor** wiki. The prompt templates under `/_prompts/` already work — you can paste them into GenAI.mil today.

## Setup

1. **Clone into a SharePoint-synced folder** on your work laptop. The app's "filesystem" IS the SharePoint-synced folder; there is no database, no server-side storage.

   ```
   cd ~/OneDrive\ -\ YourOrg/documents
   git clone <repo-url> study-wiki
   ```

   Any folder that SharePoint (or OneDrive for Business) keeps in sync will work. Personal OneDrive works too if your org permits it.

2. **(Phase 2b and later) Open `index.html` in Microsoft Edge.** Until that file exists, skip this step.

3. **That's it for setup.** No `npm install`, no `pip install`, no package manager of any kind. The entire runtime lives in files that git and SharePoint already know how to handle.

## The manual GenAI.mil loop

LLMwiki-NoDep's "AI layer" is not a fetch, not a background job, not an embedded SDK. It is you:

1. You open a prompt template from `/_prompts/` in your text editor.
2. You copy the template.
3. You paste it into GenAI.mil, fill in the input section (a source, a note body, a corpus) per the template's instructions.
4. GenAI.mil responds.
5. You paste the response back into your wiki — a new note file, an update to an existing note, a new SRS card, or (for diagnostic prompts like `gap-analysis.md`) just into a scratch document for your own use.

Every template declares a `human_turn_budget` in its frontmatter: the number of paste round-trips expected before the output is usable. If a template routinely exceeds its budget, it's a target for simplification.

## How to add a note

1. Decide which tier:
   - `/bedrock/` — permanent reference (always-loaded substrate).
   - `/warm/` — active learning (current coursework).
   - `/cold/` — archived (searchable but not auto-loaded).

   See `/bedrock/README.md`, `/warm/README.md`, `/cold/README.md` for what belongs in each.

2. Easiest path — use the ingest template:

   - Open `/_prompts/ingest.md` in your editor, copy the block.
   - Paste into GenAI.mil.
   - Paste your source (PDF text, lecture notes, textbook chapter) into the `=== UNTRUSTED INPUT START ===` section.
   - Specify the tier.
   - Paste the response into a new `.md` file in the chosen tier folder. Derive the filename from the returned `title:` per `/docs/data_schemas.md` § Filename slugging.

3. Hand-write path — create the `.md` file directly, write the frontmatter, write the body. Must match the schema in `/docs/data_schemas.md` exactly.

4. (Optional) Inject wiki links:

   - Open `/_prompts/linker.md`, paste into GenAI.mil with your new note body + a narrow title slice of `/_index.md`.
   - Paste the returned version back over your file.

5. Commit with a conventional-commits message (`feat:` for new notes, `docs:` for revisions).

## How to use a prompt template

Five templates live under `/_prompts/`:

| Template | Purpose | Human turn budget |
|---|---|---|
| `ingest.md` | Normalize a source → one note with frontmatter | 2 |
| `linker.md` | Inject `[[wiki links]]` into a note | 1 |
| `flashcards.md` | Generate SRS cards (one YAML file per card, saved to `/srs/`) | 1 |
| `review-packet.md` | Compile a targeted exam review from a corpus | 2 |
| `gap-analysis.md` | Find contradictions / missing concepts in a corpus | 3 |

Usage pattern for each is identical:
- Copy the template from `/_prompts/<name>.md`.
- Paste into GenAI.mil.
- Paste your input into the `=== UNTRUSTED INPUT START ===` section.
- Follow the template's output instructions for where to save the response.

**Context discipline:** `linker.md` and `gap-analysis.md` explicitly warn against pasting wide context. Paste narrow, targeted inputs — not your whole wiki. More context ≠ better output; it usually means silent truncation.

## Schemas and conventions

All on-disk contracts live in **one place**: `/docs/data_schemas.md`. Includes:

- Note frontmatter schema (required/optional fields, nullability, ISO 8601 UTC timestamps for audit fields).
- SRS per-card YAML schema (one file per card under `/srs/`).
- Filename slugging rules.
- Encoding conventions (UTF-8, LF, no BOM) + parser tolerance.
- `/_index.md` pinned structure (Phase 2b regenerator contract).
- SharePoint-sync conflict-file handling requirements.
- Security considerations.

Do not restate these rules in other files — always link back to `/docs/data_schemas.md`.

## Development

This repo's development discipline lives in `CLAUDE.md` (for Claude Code sessions) and `CONTRIBUTING.md` (for humans). The short version:

- Every non-trivial change follows: plan → council → approve → execute → reflect.
- The Gemini-powered council in `.github/workflows/council.yml` reviews every PR automatically.
- No runtime dependencies. Ever. Dev-time deps (lint, test) allowed under a future `devDependencies` block, but the shipped folder must work with network off.

See `CONTRIBUTING.md` for the contribution workflow and `CLAUDE.md` for the operating manual.

## Why no runtime deps / no build / no server

The target deployment reality:

- **Locked-down work laptop.** No local server, no module bundler, no `npm install`.
- **SharePoint-synced folder.** Files are the database.
- **No network egress from the app.** `fetch()` is not available; the "AI" is a human, not an HTTP call.
- **No telemetry.** Exceptions go to `console.error` and nowhere else.

Every architectural decision cascades from these constraints. The constraints are not obstacles to work around — they are the design.

## License

See `LICENSE`.
