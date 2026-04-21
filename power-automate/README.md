# Power Automate flows for LLMwiki-NoDep

Optional automation flows you can click-build in Power Automate for Government. These flows run on Microsoft infrastructure — they are not part of the wiki app, and the wiki app has no dependency on them.

## Important: this folder is documentation only

The files in `/power-automate/` are instruction documents, not wiki notes. The wiki app's file scanner does **not** read this folder — it only scans `/bedrock/`, `/warm/`, `/cold/`, and `/srs/`. These markdown files will never appear in the note list, the index, or the graph.

## Security and responsibility disclaimer

> **You are responsible for the security and resource consumption of any flows you build in your environment.** Carefully review the permissions and actions of each flow before enabling it. Verify that flows only access file metadata (filenames, modification dates, file counts), not file content, to avoid exposing sensitive information through Teams messages or email notifications.

Key principles for every flow documented here:

- **Read-only / notification-only.** No flow writes to wiki files. A flow that modifies files would bypass the app's atomic-write and stale-detection safeguards.
- **No PII in outputs.** Flows surface metadata only: filenames, tier, counts, dates. Never note body text, SRS card question/answer content, tags, or source URLs.
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
| Daily review reminder | Scheduled (daily) | 1/day | ~1 + N file reads | [daily-review-reminder.md](daily-review-reminder.md) |
| Weekly activity summary | Scheduled (weekly) | 1/week | ~4 folder listings | [weekly-summary.md](weekly-summary.md) |

## Resource cost summary

All three flows combined, at typical usage:

- **Flow runs/week:** ~8–12 (3–5 note notifications + 7 daily reminders + 1 weekly summary)
- **Actions/week:** ~750 (dominated by the daily reminder scanning ~100 cards/day)
- **GenAI Action Credits:** 0 (no AI Builder actions)
- **Teams notifications/week:** ~8–12

Check these numbers against your org's plan ceiling before enabling all three simultaneously.
