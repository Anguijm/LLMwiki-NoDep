# Flow: Weekly wiki activity summary

Post a weekly summary of wiki activity: notes modified and cards reviewed.

## Metadata

| Field | Value |
|---|---|
| Trigger | Scheduled — Recurrence (weekly) |
| Schedule | Once per week (e.g., Friday 5:00 PM local) |
| Actions per run | ~4 (folder listings for bedrock, warm, cold, srs) + 1 (Teams post) |
| Typical action count | ~5 |
| Run frequency | 1/week |
| GenAI Action Credits | 0 |
| Secrets required | None |
| Reads file content | **No** — only file metadata (modification dates, file counts) |

## What the notification contains

- Count of notes modified in the last 7 days (across bedrock/, warm/, cold/)
- Count of SRS cards modified in the last 7 days (proxy for "cards reviewed")
- The date range covered

Example: `"Wiki summary (Apr 15–22): 4 notes modified, 12 cards reviewed."`

**What it does NOT contain:** note titles, note body text, card question/answer text, tags, sources, or any content from inside files.

## Step-by-step build instructions

1. Go to Power Automate → **Create** → **Scheduled cloud flow**.
2. Name it: `LLMwiki — Weekly Summary`.
3. Set schedule: repeat every 1 week, on your preferred day and time.

4. **Initialize variables:**
   - `notes_modified` (Integer): `0`
   - `cards_modified` (Integer): `0`
   - `week_ago` (String): `formatDateTime(addDays(convertFromUtc(utcNow(), 'YOUR_TIMEZONE'), -7), 'yyyy-MM-ddTHH:mm:ssZ')`

5. **For each tier folder** (bedrock, warm, cold):
   a. **Action: SharePoint — Get files (properties only)** in the tier folder.
      - Filter by last modified date >= `week_ago`.
   b. **Increment** `notes_modified` by the count of returned files.

6. **For the srs/ folder:**
   a. **Action: SharePoint — Get files (properties only)** in `/srs/`.
      - Filter by last modified date >= `week_ago`.
      - Filter: only `.yaml` files (exclude `.tmp` and conflict files).
   b. **Set** `cards_modified` to the count of returned files.

7. **Action: Microsoft Teams — Post message:**
   - `"Wiki summary (@{formatDateTime(addDays(utcNow(), -7), 'MMM dd')}–@{formatDateTime(utcNow(), 'MMM dd')}): @{variables('notes_modified')} notes modified, @{variables('cards_modified')} cards reviewed."`

8. **Save** and **Turn on**.

## Customization

- **Channel:** post to a specific Teams channel for study-group visibility, or to a private chat for personal tracking.
- **Breakdown by tier:** instead of a single `notes_modified` count, report per-tier counts (e.g., "2 bedrock, 1 warm, 1 cold").
- **Skip if no activity:** add a condition to suppress the message if both counts are 0.
- **Monthly variant:** duplicate the flow, change the schedule to monthly, and adjust `addDays` to `-30`.
