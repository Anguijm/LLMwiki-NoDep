# Power Automate flows for LLMwiki-NoDep

Optional automation flows you can click-build in Power Automate for Government. These flows run on Microsoft infrastructure — they are not part of the wiki app, and the wiki app has no dependency on them.

## Important: this folder is documentation only

The files in `/power-automate/` are instruction documents, not wiki notes. The wiki app's file scanner does **not** read this folder — it only scans `/bedrock/`, `/warm/`, `/cold/`, and `/srs/`. These markdown files will never appear in the note list, the index, or the graph.

## Security and responsibility disclaimer

> **You are responsible for the security and resource consumption of any flows you build in your environment.** Carefully review the permissions and actions of each flow before enabling it. Verify that flows only access file metadata (filenames, modification dates, file counts), not file content, to avoid exposing sensitive information through Teams messages or email notifications.

> **Privacy model contrast:** The wiki app (`index.html`) is entirely local — it runs from `file://`, makes no network calls, and logs nothing to any server. Power Automate flows are the opposite: they run on Microsoft cloud infrastructure, and their run history (inputs, outputs, intermediate data) is stored in your org's Power Automate environment and visible to IT administrators. **None of the flows documented here read file content** — they operate on metadata only (filenames, counts, modification dates). If you customize a flow to read file content, that content will be logged to run history. Check your org's data retention policy.

Key principles for every flow documented here:

- **Read-only / notification-only.** No flow writes to wiki files. A flow that modifies files would bypass the app's atomic-write and stale-detection safeguards.
- **No PII in outputs or processing.** No flow reads file content. Teams messages contain metadata only: filenames, tier, counts, dates. Never note body text, SRS card question/answer content, tags, or source URLs.
- **No secrets.** Flows use the SharePoint connector (authenticated via your org account) and the Teams connector (same). No API keys stored in the flow.
- **No external API calls.** No GenAI.mil, no Anthropic, no OpenAI. No AI Builder actions.

## Before you start

1. **Check your org's Power Automate plan limits.** Some orgs throttle Power Automate for Government to N runs/day or N actions/month. Each flow doc below declares its expected run frequency and action count so you can estimate impact.

2. **Verify your SharePoint folder permissions.** The flows access the same SharePoint-synced folder your wiki lives in. Confirm you have at least read access via the SharePoint connector.

3. **Bookmark your org's Power Automate admin page:** `https://flow.microsoft.com/` (or your org's equivalent). You'll build and manage flows there.

## Available flows

| Flow | Trigger | Frequency | Actions/run | Doc |
|---|---|---|---|---|
| New note notification | SharePoint file-created | ~3–5/week | 1 | [new-note-notification.md](new-note-notification.md) |
| Daily review reminder | Scheduled (daily) | 1/day | ~2 | [daily-review-reminder.md](daily-review-reminder.md) |
| Weekly activity summary | Scheduled (weekly) | 1/week | ~4 folder listings | [weekly-summary.md](weekly-summary.md) |

## Resource cost summary

All three flows combined, at typical usage:

- **Flow runs/week:** ~8–12 (3–5 note notifications + 7 daily reminders + 1 weekly summary)
- **Actions/week:** ~30 (lightweight metadata-only operations)
- **GenAI Action Credits:** 0 (no AI Builder actions)
- **Teams notifications/week:** ~8–12

Check these numbers against your org's plan ceiling before enabling all three simultaneously.

## Troubleshooting

**Flow runs but no notification appears:**
- Check the flow's run history in Power Automate → **My flows** → click the flow → **Run history**. Look for failed steps (red X icons).
- Common cause: the SharePoint connector lost authentication. Re-authorize in the flow's connection settings.

**Daily reminder always shows the same total count:**
- This is by design. The daily reminder counts total card files (metadata only, no content read). It's a nudge to open the app, which has the accurate due-card logic. The count may include conflict files if not filtered — see below.

**Notifications for temp files or conflict copies:**
- Ensure the filtering conditions in each flow match the documented instructions. SharePoint conflict files (e.g., `card (1).yaml`), Office temp files (`~$note.md`), and dot-prefixed temp files (`.card.yaml.tmp`) should all be filtered out.

**New-note notification for a file that no longer exists:**
- If a file is created and then quickly renamed (before SharePoint sync completes), the flow may fire on the original filename. This is a known race condition with the SharePoint file-created trigger. The notification is benign — the user can ignore it.

**Sync lag — notification count doesn't match what you see locally:**
- Power Automate reads SharePoint's server-side state, which may lag a few minutes behind your local sync client. Wait for sync to complete, or run the flow manually after confirming files are synced.

**Flow runs too often / hits org limits:**
- The three documented flows combined use ~30 actions/week at typical usage. If you have >500 cards, enable pagination and check your org's action quota.
