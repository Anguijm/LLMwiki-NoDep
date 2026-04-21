# Flow: New note notification

Post a Teams message (or send an email) when a new note is created in any tier folder.

## Metadata

| Field | Value |
|---|---|
| Trigger | SharePoint — "When a file is created in a folder" |
| Trigger scope | `/bedrock/`, `/warm/`, `/cold/` (one trigger per folder, or one trigger on the parent with a condition) |
| Action | Post a message to a Teams channel (or send an email) |
| Run frequency | ~3–5/week (matches typical note-creation cadence) |
| Actions per run | 1 (the Teams/email post) |
| GenAI Action Credits | 0 |
| Secrets required | None |
| Reads file content | **No** — only the file name and folder path |

## What the notification contains

- The note's filename (e.g., `laplace-transforms.md`)
- The tier folder it was created in (e.g., `warm`)
- A timestamp of when the file was detected

**What it does NOT contain:** note body text, frontmatter fields (title, tags, sources), or any content from inside the file. This prevents PII or study content from leaking into Teams.

## Step-by-step build instructions

### Option A: One trigger per tier folder (simpler)

1. Go to Power Automate → **Create** → **Automated cloud flow**.
2. Name it: `LLMwiki — New Note (bedrock)`.
3. Trigger: **SharePoint — When a file is created in a folder**.
   - Site Address: your SharePoint site.
   - Folder: `/path/to/your/wiki/bedrock`.
4. **Add filtering conditions** (important — prevents false notifications):
   - **Condition 1:** file name ends with `.md` — skip non-markdown files.
   - **Condition 2:** file name does NOT start with `~$` — skip Office temp files.
   - **Condition 3:** file name does NOT contain ` (` — skip SharePoint conflict copies like `note (1).md`.
5. If all conditions pass → **Microsoft Teams — Post message in a chat or channel** (or **Send an email (V2)**).
   - Message body: `New note in bedrock: @{triggerOutputs()?['body/{FilenameWithExtension}']}`
6. **Save** and **Turn on**.
7. Repeat for `warm` and `cold` folders (3 flows total).

### Option B: Single trigger on parent folder with condition

1. Trigger: **SharePoint — When a file is created in a folder** on the wiki root folder.
2. Add **conditions** (all must pass):
   - File path contains `/bedrock/` OR `/warm/` OR `/cold/` — filters out `/srs/`, `/power-automate/`, `/_prompts/`, etc.
   - File name ends with `.md` — skip non-markdown files.
   - File name does NOT start with `~$` — skip Office temp files.
   - File name does NOT contain ` (` — skip SharePoint conflict copies.
3. If all pass → post the Teams message.
4. If any fail → do nothing (terminate).

Option A is simpler but creates 3 flows. Option B is one flow but requires more condition steps.

## Customization

- **Channel:** pick the Teams channel or chat where you want notifications. A private chat with yourself is fine for solo use.
- **Quiet hours:** add a condition to skip notifications outside work hours if desired.
- **Batch:** if note-creation bursts are common, consider adding a 5-minute delay + "Get items" to batch multiple creations into one message.
