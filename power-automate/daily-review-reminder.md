# Flow: Daily SRS review reminder

Send a daily Teams reminder to open the wiki app and check for due cards.

## Metadata

| Field | Value |
|---|---|
| Trigger | Scheduled — Recurrence (daily) |
| Schedule | Once per day at a user-configured time (e.g., 8:00 AM local) |
| Actions per run | 1 (list files in /srs/) + 1 (Teams post) |
| Typical action count | 2 |
| Run frequency | 1/day |
| GenAI Action Credits | 0 |
| Secrets required | None |
| Reads file content | **No** — only file count and metadata (names, modification dates) |

## Design rationale

An earlier version of this flow attempted to parse card YAML files to determine which cards are due. That approach was rejected because:

1. **PII leakage.** The "Get file content" action logs full card content (including question/answer text) to Power Automate run history, visible to IT administrators. This violates the wiki's "No PII in logs" principle.
2. **Fragile parsing.** Power Automate cannot natively parse YAML. String heuristics are brittle and fail on malformed cards.

The current design avoids reading file content entirely. It counts cards and reminds the user to open the app, which has the correct due-card logic built in.

## What the notification contains

- Total count of SRS card files in `/srs/`
- A reminder to open `index.html` and check the Review button for due cards

Example: `"You have 47 SRS cards. Open your wiki to check for due reviews."`

**What it does NOT contain:** card IDs, question text, answer text, due dates, or any content from inside card files.

## Step-by-step build instructions

1. Go to Power Automate → **Create** → **Scheduled cloud flow**.
2. Name it: `LLMwiki — Daily Review Reminder`.
3. Set schedule: repeat every 1 day, at your preferred time.

4. **Action: SharePoint — Get files (properties only)** in the `/srs/` folder.
   - Site Address: your SharePoint site.
   - Library: your document library.
   - Folder: `/path/to/your/wiki/srs`
   - Filter: `substringof('.yaml', FileLeafRef)` (only YAML files)
   - Enable pagination in Settings (click `...` → Settings) if you have >100 cards.

5. **Compose — count files:**
   - Expression: `length(body('Get_files_(properties_only)'))`

6. **Condition:** count > 0.
   - If yes: **Microsoft Teams — Post message**: `"You have @{outputs('Compose')} SRS cards. Open your wiki to check for due reviews."`
   - If no: do nothing.

7. **Save** and **Turn on**.

## Customization

- **Skip weekends:** add a condition checking `dayOfWeek(utcNow())` — skip if 0 (Sunday) or 6 (Saturday).
- **Skip if no recent activity:** add a condition to only notify if at least one `.yaml` file was modified in the last 7 days (indicating active use).
- **Smarter due-card detection:** if you're comfortable with the PII-in-run-history tradeoff, you can add a "Get file content" step to parse `next_review:` dates. Be aware this logs full card content to your Power Automate run history. See the wiki's security checklist for the risks.
