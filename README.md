# LLMwiki-NoDep

A zero-dependency, static-file personal study wiki. Runs from a SharePoint-synced folder opened directly in Microsoft Edge via `file://`. No server, no build step, no runtime API calls, no CDN. All "AI" is a human copy/paste loop against GenAI.mil.

Built for a specific workflow: a locked-down work laptop, a single engineer-user, SharePoint sync as the storage layer, manual prompts as the AI layer.

## Status

- **Phase 1** (council harness): merged.
- **Phase 2a** (folder structure + prompt templates + schema docs + empty SRS folder): merged.
- **Phase 2b** (`index.html` + inline markdown parser + wiki-link resolver + `_index.md` regenerator): merged.
- **Phase 2c** (SRS review mode + outline view): merged.
- **Phase 2d** (Power Automate flow docs): this branch.

The app is fully usable: open `index.html` in Edge, grant folder access, and your wiki renders with linked notes, backlinks, SRS review, and a knowledge-graph outline. The prompt templates under `/_prompts/` continue to work via the GenAI.mil copy/paste loop.

## Setup

1. **Clone into a SharePoint-synced folder** on your work laptop. The app's "filesystem" IS the SharePoint-synced folder; there is no database, no server-side storage.

   ```
   cd ~/OneDrive\ -\ YourOrg/documents
   git clone <repo-url> study-wiki
   ```

   Any folder that SharePoint (or OneDrive for Business) keeps in sync will work. Personal OneDrive works too if your org permits it.

2. **Open `index.html` in Microsoft Edge** (or any Chromium browser). Right-click the file → Open with → Edge, or navigate to `file:///path/to/study-wiki/index.html`.

3. **Grant folder access.** The app will prompt you to select your wiki folder via a directory picker. This gives the app read/write access to scan notes and regenerate `_index.md`. If you prefer not to grant write access (or your browser doesn't support the File System Access API), drag your wiki folder onto the drop zone for read-only mode — `_index.md` regeneration is skipped in this mode.

4. **That's it for setup.** No `npm install`, no `pip install`, no package manager of any kind. The entire runtime lives in files that git and SharePoint already know how to handle.

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

## How to review SRS cards

1. Create flashcards using `/_prompts/flashcards.md` — paste a note into GenAI.mil, save each returned YAML block as `/srs/<id>.yaml`.
2. Open `index.html`. The **Review** button in the header shows how many cards are due today.
3. Click **Review** to enter review mode. You'll see one card at a time: question first, then click **Show answer**.
4. Rate each card: **Again** (1), **Hard** (2), **Good** (3), or **Easy** (4). The SM-2 algorithm updates the card's ease, interval, and next review date.
5. Each rating saves the card to disk immediately. A session summary appears when all due cards are reviewed.

**SharePoint sync note:** each card rating triggers a file write to `/srs/`. If your wiki folder is shared via SharePoint, these writes (and the resulting sync events) are visible to anyone with folder access. This is expected behavior — the app warns you in the review UI.

## How to use the outline view

Click the **Outline** button in the header to see all notes grouped by tier, with their outgoing `[[wiki links]]` listed underneath. Click any note or link to navigate to it. The outline is the default view when `prefers-reduced-motion` is active.

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

**One thing to know about the SharePoint layer:** every file modification — every flashcard review, every note edit, every `_index.md` regeneration — is visible in the SharePoint folder's version history to anyone with access to that folder. The one-file-per-card SRS architecture means individual review actions appear as discrete sync events. If your study-wiki folder is shared (even just with an IT admin), those events are visible. If that's not the audience you want, make sure the folder's SharePoint permissions match your expectations before you start adding content.

## License

See `LICENSE`.
