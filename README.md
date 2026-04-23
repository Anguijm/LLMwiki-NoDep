# LLMwiki-NoDep

A zero-dependency, static-file **personal reference corpus** for instruction and guidance material. Runs from a SharePoint-synced folder opened directly in Microsoft Edge via `file://`. No server, no build step, no runtime API calls, no CDN. All "AI" is a human copy/paste loop against GenAI.mil.

Built for a specific workflow: a single user, a locked-down work laptop, SharePoint sync as the storage layer, manual prompts as the AI layer. The goal is **ease of access to your own accumulated corpus** of procedures, manuals, regulations, and reference notes — not exam prep, not shared knowledge management. One human, one corpus, one laptop.

---

## Quick start (no git required)

**You do NOT need git, npm, Python, or any developer tools.** The entire app is files in a folder. Here's how to get it running on a locked-down work laptop:

### Step 1: Get the files onto your laptop

Your work laptop likely blocks ZIP downloads and doesn't have git. That's fine — the app is just files. Pick whichever method works in your environment:

**Option A — Copy file contents from GitHub (works on any locked-down laptop):**

You only need **one file** to run the app: `index.html`. Everything else (folders, prompt templates) you create by hand.

1. Go to this repository on GitHub and click on **`index.html`** to view it.
2. Click the **Raw** button (top-right of the file view) to see the plain text.
3. **Select all** (Ctrl+A) and **Copy** (Ctrl+C).
4. On your laptop, open **Notepad** (not Word — it must be a plain text editor).
5. **Paste** (Ctrl+V) the content into Notepad.
6. **Save As** → navigate to your target folder (see Step 2) → filename: `index.html` → Save as type: **All Files (\*.\*)** (important — don't let Notepad save it as `index.html.txt`).
7. Create these empty folders inside the same folder: `bedrock`, `warm`, `cold`, `srs`.

That's the minimum. The prompt templates (`_prompts/` folder) are optional but useful — repeat the Raw → Copy → Paste → Save process for each one you want:
- `_prompts/ingest.md`
- `_prompts/linker.md`
- `_prompts/flashcards.md`
- `_prompts/review-packet.md`
- `_prompts/gap-analysis.md`

**Option B — Copy from a colleague's USB drive or shared folder:**

If someone has already set up LLMwiki-NoDep, they can put the folder on a USB drive or a shared network location. Copy the entire folder to your target location (Step 2).

**Option C — Email the files to yourself:**

Have someone with a less restricted machine email you the individual files as attachments (`.html` and `.md` files are rarely blocked by email scanners). Save them to your target folder.

**Option D — Git clone (if git is available):**

```
cd ~/OneDrive\ -\ YourOrg/documents
git clone https://github.com/Anguijm/LLMwiki-NoDep.git reference-corpus
```

**Option E — Download ZIP (if your security scanner permits):**

Click the green **Code** button on GitHub → **Download ZIP** → extract to your target folder.

### Step 2: Put the folder in a SharePoint-synced location

The wiki's "database" is the folder itself. For your notes to sync across devices and survive laptop reimages, the folder must live in a location that SharePoint (or OneDrive for Business) syncs.

**Where to put it:**

| Location | Works? | Notes |
|---|---|---|
| `C:\Users\you\OneDrive - YourOrg\Documents\reference-corpus\` | Yes (best) | Standard OneDrive for Business sync path |
| `C:\Users\you\OneDrive\Documents\reference-corpus\` | Yes | Personal OneDrive (if your org permits) |
| Any SharePoint-synced library folder | Yes | Right-click in SharePoint → "Sync" adds it to File Explorer |
| `C:\Users\you\Desktop\reference-corpus\` | Partial | Works locally but won't sync unless Desktop is in OneDrive |
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
5. In the app, click **Rescan** (or reload the page). Your note appears.

**Note:** `tier: warm` is the default landing tier for new material. Use `/bedrock/` only when the content is durable, invariant reference (rarely edited, reached-for repeatedly); use `/cold/` for archival material you still want to search but no longer consult routinely.

---

## What you need vs. what you don't

| You need | You don't need |
|---|---|
| Microsoft Edge (or any Chromium browser) | Node.js, npm, Python, or any runtime |
| A SharePoint-synced folder (OneDrive for Business) | Git |
| A text editor (even Notepad works) | A terminal or command line |
| Access to GitHub (to copy the `index.html` source once) | The ability to download ZIP files |
| Access to GenAI.mil (for the AI-assisted prompts) | An internet connection while using the app |

**The app works completely offline.** Once the files are on your laptop, Wi-Fi can be off. The only network dependency is SharePoint sync (which happens in the background) and GenAI.mil (which you use in a separate browser tab, not inside the app).

---

## Folder structure

**Minimum viable setup** (if you only copied `index.html`):

```
reference-corpus/
├── index.html          ← THE APP — open this in Edge
├── bedrock/             ← create this empty folder
├── warm/                ← create this empty folder
├── cold/                ← create this empty folder
└── srs/                 ← create this empty folder
```

That's enough to run the app. Everything else is optional.

**Full setup** (after copying all files from GitHub):

```
reference-corpus/
├── index.html          ← THE APP — open this in Edge
├── _index.md            ← auto-generated note index (don't edit by hand)
├── bedrock/             ← permanent reference (durable, invariant)
├── warm/                ← default landing tier for new material (active reference)
├── cold/                ← archived (searchable but not actively consulted)
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

1. Decide which tier. **`/warm/` is the default** — use it unless one of the other tiers is clearly justified:
   - `/bedrock/` — permanent reference (always-loaded substrate; durable, invariant material you reach for repeatedly).
   - `/warm/` — active reference (default landing tier for new material).
   - `/cold/` — archived (searchable but not auto-loaded; material you no longer consult routinely).

   See `/bedrock/README.md`, `/warm/README.md`, `/cold/README.md` for what belongs in each.

2. Easiest path — use the ingest template:

   - Open `/_prompts/ingest.md` in your editor, copy the block.
   - Paste into GenAI.mil.
   - Paste your source (PDF text, procedure, manual excerpt, regulation, reference doc) into the `=== UNTRUSTED INPUT START ===` section.
   - Specify the tier (default `warm`).
   - Paste the response into a new `.md` file in the chosen tier folder. Derive the filename from the returned `title:` per `/docs/data_schemas.md` § Filename slugging.

3. Hand-write path — create the `.md` file directly, write the frontmatter, write the body. Must match the schema in `/docs/data_schemas.md` exactly.

4. (Optional) Inject wiki links:

   - Open `/_prompts/linker.md`, paste into GenAI.mil with your new note body + a narrow title slice of `/_index.md`.
   - Paste the returned version back over your file.

5. If you have git: commit with a conventional-commits message (`feat:` for new notes, `docs:` for revisions). If you don't have git, that's fine — SharePoint versioning is your backup.

## How to import a large document

When your source is a multi-section document — a multi-chapter manual, a multi-section SOP, a regulation with numbered parts, a reference book — you can split it into **one note per section** in a single paste, rather than running `ingest.md` once per chapter. The Import view in `index.html` handles the multi-section parse, preview, and commit. The AI side runs in GenAI.mil's agent mode (not chat mode), so this workflow has one prerequisite.

### Prerequisites

- **GenAI.mil agent mode.** If your GenAI.mil account only supports chat, fall back to running `/_prompts/ingest.md` one chapter at a time. The large-document prompt is agent-only because chat's one-round paradigm doesn't fit section-by-section orchestration.
- The `index.html` app running via `file://` in Edge, with folder permission already granted (Steps 2–4 of Quick start).

### Step-by-step workflow

1. Open `/_prompts/ingest-large-agent.md` in your text editor.
2. Configure the main agent + four subagents in GenAI.mil per the template's "How to configure in GenAI.mil" section. The subagents are `structure-scanner`, `per-section-normalizer`, `tier-recommender`, and `cross-link-suggester` — each has its own system-prompt block and I/O contract.
3. Fill in the template's "My parameters" section:
   - Current ISO 8601 UTC timestamp (generate locally; the model cannot read your clock).
   - Optional source URL or filename.
   - Optional existing-title list from `/_index.md` (for cross-corpus `[[wiki-link]]` suggestions).
4. Paste your source document into the `=== UNTRUSTED INPUT START ===` block in the main agent's prompt.
5. Run the agent. It returns **one output block** containing multiple `<<<LLMWIKI-SECTION:slug>>>` … `<<<LLMWIKI-SECTION-END:slug>>>` pairs, each wrapping a per-section YAML frontmatter + body.
6. In `index.html`, click the **Import** button in the header. The Multi-section import view opens.
7. Paste the agent's entire output block into the **"Paste agent-formatted content here"** field.
8. Click **Parse**. The app shows the preview pane below.

### Reviewing the preview pane

The preview shows one row per section, collapsed by default. For each row you can:

- **Edit the title.** The auto-derived slug (the filename, minus `.md`) updates live as you type. The app uses its canonical slugging rules — not the slug the agent emitted — so if the agent's suggested slug differs, you'll see a note like *"Canonical slug 'foo-bar' differs from sentinel (normalized case)."* That's informational, not a block.
- **Change the tier.** The dropdown defaults to **Warm (default)**; switch to **Bedrock** or **Cold** when the material warrants it.
- **Expand preview.** Click **Expand preview** on a row to see the rendered body (same escape-by-default markdown parser as the note viewer). Collapse again to keep the preview list compact.
- **Resolve collisions.** If a proposed slug matches an existing file in its target tier, the row shows a collision indicator (icon + text, not color alone) with options to skip, rename (the slug re-derives live as you edit), or overwrite (overwrite requires a separate confirmation).
- **Review warnings.** Dangling `[[wiki-link]]` suggestions whose target is neither in the batch nor in the current corpus surface as row warnings — not blockers.

### Committing

Click **Commit N sections**. The button is disabled while any row has an unresolved issue (empty title, unresolved collision, invalid filename). Before writing, the app runs a **pre-commit scan** of your tier folders to catch any collisions that appeared between the initial parse and commit (for example, a SharePoint sync pulling in a new file mid-review). If new collisions are detected, the scan pauses the commit and you resolve them before retrying.

Writes are atomic per file (temp-and-rename). If some files succeed and others fail, the UI shows per-file error causes (permission denied, file exists, quota, handle revoked, etc.) and offers a **Retry N failed files** button that re-attempts only the failures — successful writes are never re-written.

After commit, click **Rescan** (or reload the page) and regenerate `_index.md` via the existing affordance so your new notes appear in the index and become reachable via `[[wiki-link]]`.

### The 200-section cap

The Import view parser rejects pastes that resolve to more than 200 sections with a `parser.too-many-sections` diagnostic. The large-document prompt instructs the main agent to coarsen section boundaries or batch the source if it would otherwise exceed the cap — handle the cap upstream in the agent. The cap exists to keep the preview pane responsive; it is revisitable if real usage pressures it.

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
| `flashcards.md` | Generate SRS cards (one YAML file per card, saved to `/srs/`) — optional retention layer on your reference material | 1 |
| `review-packet.md` | Compile a targeted refresher on a topic from a subset of your corpus | 2 |
| `gap-analysis.md` | Find contradictions / missing concepts in a narrow subset of your corpus | 3 |

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

**Import view says "Parse failed" with a delimiter or YAML error:**
- The agent output deviated from the `<<<LLMWIKI-SECTION:slug>>>` / `<<<LLMWIKI-SECTION-END:slug>>>` format, or one section's frontmatter is not valid YAML. The diagnostic names the category (`delimiter.invalid-slug`, `delimiter.unterminated-section`, `frontmatter.yaml-parse-error`, etc.) and the line number. Re-run the agent, or paste only the offending section back into GenAI.mil and ask the agent to re-emit it per the contract in `/_prompts/ingest-large-agent.md`.

**Import view says "Parsed N sections (limit 200)":**
- Your paste resolved to more than 200 sections. Re-prompt the main agent to coarsen section boundaries (for example, split on level-1 headings only, combining level-2 subsections into their parent), or split the source document into multiple batches and paste each through the Import view separately.

**Import view says "No sections found":**
- The agent's output contained no `<<<LLMWIKI-SECTION:` / `<<<LLMWIKI-SECTION-END:` pairs. Check the agent's raw output — it may have wrapped the content in commentary prose instead of emitting delimited sections. Re-run the agent and reinforce the output-format contract from `/_prompts/ingest-large-agent.md`.

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

**One thing to know about the SharePoint layer:** every file modification — every flashcard review, every note edit, every `_index.md` regeneration — is visible in the SharePoint folder's version history to anyone with access to that folder. The one-file-per-card SRS architecture means individual review actions appear as discrete sync events. Even though this is a single-user product (no team or multi-user features), the SharePoint path usually exposes the folder to your IT admin, and any other admin with folder permissions can see those events. Make sure the folder's SharePoint permissions match your expectations before you start adding content.

## License

See `LICENSE`.
