# LLMwiki-NoDep

A zero-dependency, static-file personal study wiki. Runs from a SharePoint-synced folder opened directly in Microsoft Edge via `file://`. No server, no build step, no runtime API calls, no CDN. All "AI" is a human copy/paste loop against GenAI.mil.

Built for a specific workflow: a locked-down work laptop, a single engineer-user, SharePoint sync as the storage layer, manual prompts as the AI layer.

---

## Quick start (no git required)

**You do NOT need git, npm, Python, or any developer tools.** The entire app is files in a folder. Here's how to get it running on a locked-down work laptop:

### Step 1: Download the files

**Option A — Download ZIP from GitHub (easiest, no git needed):**

1. Go to this repository's GitHub page.
2. Click the green **Code** button near the top right.
3. Click **Download ZIP**.
4. Save the ZIP file somewhere temporary (e.g., your Desktop or Downloads folder).
5. **Right-click the ZIP** → **Extract All** → choose your target folder (see Step 2).

**Option B — Copy from a USB drive or shared folder:**

If someone has already set up LLMwiki-NoDep, they can send you the folder. Just copy the entire folder to your target location (Step 2).

**Option C — Git clone (if git is available):**

```
cd ~/OneDrive\ -\ YourOrg/documents
git clone https://github.com/Anguijm/LLMwiki-NoDep.git study-wiki
```

### Step 2: Put the folder in a SharePoint-synced location

The wiki's "database" is the folder itself. For your notes to sync across devices and survive laptop reimages, the folder must live in a location that SharePoint (or OneDrive for Business) syncs.

**Where to put it:**

| Location | Works? | Notes |
|---|---|---|
| `C:\Users\you\OneDrive - YourOrg\Documents\study-wiki\` | Yes (best) | Standard OneDrive for Business sync path |
| `C:\Users\you\OneDrive\Documents\study-wiki\` | Yes | Personal OneDrive (if your org permits) |
| Any SharePoint-synced library folder | Yes | Right-click in SharePoint → "Sync" adds it to File Explorer |
| `C:\Users\you\Desktop\study-wiki\` | Partial | Works locally but won't sync unless Desktop is in OneDrive |
| A network drive (`\\server\share\`) | No | File System Access API doesn't work over UNC paths |

**How to verify sync is working:** after you place the folder, wait 30 seconds. You should see the OneDrive sync icon (blue cloud or green checkmark) appear on the folder in File Explorer.

### Step 3: Open the app

1. Navigate to your wiki folder in File Explorer.
2. **Double-click `index.html`** — it should open in Microsoft Edge. If it opens in a different app, right-click → **Open with** → **Microsoft Edge**.
3. You'll see a landing page with a **"Choose wiki folder"** button.

### Step 4: Grant folder access

1. Click **"Choose wiki folder"**.
2. Edge will show a system dialog asking you to select a folder. **Navigate to and select the wiki folder itself** (the folder containing `index.html`, `bedrock/`, `warm/`, `cold/`, etc.).
3. Edge will ask **"View files"** permission — click **Allow**.
4. After scanning, Edge may ask **"Save changes"** permission (for `_index.md` regeneration) — click **Allow**. If you decline, the app works in read-only mode.

**That's it.** You should see your wiki rendered with the note list on the left, content in the center, and backlinks on the right.

### Step 5: Add your first note

1. Open your text editor (Notepad, VS Code, whatever you have).
2. Create a new file in the `warm/` folder called `my-first-note.md`.
3. Paste this content:

```markdown
---
title: My First Note
tier: warm
created: 2026-04-22T12:00:00Z
updated: 2026-04-22T12:00:00Z
tags: [getting-started]
---

This is my first wiki note. I can link to other notes using [[wiki link syntax]].

Key concepts:
- Notes live in tier folders: bedrock (permanent), warm (active), cold (archived)
- The app parses markdown and resolves [[wiki links]] by title
- SRS flashcards go in the /srs/ folder as individual YAML files
```

4. Save the file.
5. In the wiki app, click **Rescan** (or reload the page). Your note appears.

---

## What you need vs. what you don't

| You need | You don't need |
|---|---|
| Microsoft Edge (or any Chromium browser) | Node.js, npm, Python, or any runtime |
| A SharePoint-synced folder (OneDrive for Business) | Git (nice to have, not required) |
| A text editor (even Notepad works) | A terminal or command line |
| Access to GenAI.mil (for the AI-assisted prompts) | An internet connection while using the app |

**The app works completely offline.** Once the files are on your laptop, Wi-Fi can be off. The only network dependency is SharePoint sync (which happens in the background) and GenAI.mil (which you use in a separate browser tab, not inside the app).

---

## Folder structure

After download/extraction, your wiki folder looks like this:

```
study-wiki/
├── index.html          ← THE APP — open this in Edge
├── _index.md            ← auto-generated note index (don't edit by hand)
├── bedrock/             ← permanent reference notes
├── warm/                ← active learning notes
├── cold/                ← archived notes
├── srs/                 ← SRS flashcard YAML files (one per card)
├── _prompts/            ← GenAI.mil prompt templates
│   ├── ingest.md
│   ├── linker.md
│   ├── flashcards.md
│   ├── review-packet.md
│   └── gap-analysis.md
├── docs/                ← schema documentation
├── power-automate/      ← optional Power Automate flow docs
└── (dev files)          ← package.json, tests/, etc. (ignore these)
```

**Files you interact with:** `index.html` (open it), the tier folders (add notes), `srs/` (flashcards), `_prompts/` (copy/paste templates).

**Files you ignore:** everything else. The dev files (`package.json`, `test.html`, `tests/`, `.github/`, `.harness/`, `eslint.config.js`, etc.) are for contributors, not users.

---

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

5. If you have git: commit with a conventional-commits message (`feat:` for new notes, `docs:` for revisions). If you don't have git, that's fine — SharePoint versioning is your backup.

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

## Troubleshooting

**"index.html opens as code, not as an app":**
- You're probably opening it in a text editor. Right-click → **Open with** → **Microsoft Edge**.

**"Choose wiki folder" button does nothing:**
- Your browser may not support the File System Access API (Firefox, Safari). Use Edge or Chrome. Alternatively, drag your wiki folder onto the drop zone for read-only mode.

**"No notes found" after granting folder access:**
- Make sure you selected the **wiki root folder** (the one containing `index.html`), not a subfolder like `warm/`.
- Make sure your notes have `.md` extension and valid frontmatter (starts with `---`).

**Notes aren't showing after I add a new file:**
- Click **Rescan** in the header, or reload the page (F5).

**"Folder access was revoked":**
- Edge's File System Access API permission expires when you close the tab. Reload and re-grant.

**The app looks broken / CSS is wrong:**
- Make sure you're opening `index.html` directly from `file://`, not from a web server. The app is designed for `file://` only.

**SharePoint sync conflict files (`note (1).md`) appearing:**
- Two devices edited the same file. The app shows these in the "Sync conflicts" panel. Open both files in your text editor, merge manually, delete the conflict copy.

## Schemas and conventions

All on-disk contracts live in **one place**: `/docs/data_schemas.md`. Includes:

- Note frontmatter schema (required/optional fields, nullability, ISO 8601 UTC timestamps for audit fields).
- SRS per-card YAML schema (one file per card under `/srs/`).
- Filename slugging rules.
- Encoding conventions (UTF-8, LF, no BOM) + parser tolerance.
- `/_index.md` pinned structure (regenerator contract).
- SharePoint-sync conflict-file handling requirements.
- Security considerations.

Do not restate these rules in other files — always link back to `/docs/data_schemas.md`.

## Development

This repo's development discipline lives in `CLAUDE.md` (for Claude Code sessions) and `CONTRIBUTING.md` (for humans). The short version:

- Every non-trivial change follows: plan → council → approve → execute → reflect.
- The Gemini-powered council in `.github/workflows/council.yml` reviews every PR automatically.
- CI runs ESLint, Prettier, and Vitest on every PR.
- No runtime dependencies. Ever. Dev-time deps (lint, test) are in `devDependencies` only.

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
