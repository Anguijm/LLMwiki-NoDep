# Flow: Daily SRS review reminder

Check if any SRS cards are due for review and send a Teams notification if so.

## Metadata

| Field | Value |
|---|---|
| Trigger | Scheduled — Recurrence (daily) |
| Schedule | Once per day at a user-configured time (e.g., 8:00 AM local) |
| Actions per run | 1 (list files) + N (get file content per card) + 1 (Teams post if due) |
| Typical action count | ~102 for 100 cards (1 list + 100 reads + 1 post) |
| Run frequency | 1/day |
| GenAI Action Credits | 0 |
| Secrets required | None |
| Reads file content | **Yes — but only the `next_review:` line**, not question/answer text. See "What the notification contains" and "Run history warning" below. |

## Important: YAML parsing limitation

Power Automate cannot natively parse YAML. This flow uses a **string-contains heuristic** to check if a card is due. Specifically, it reads each `.yaml` file's text content and checks whether the `next_review:` value is less than or equal to today's local date.

**Known limitation:** if a card's question or answer text happens to contain the literal string `next_review:`, the heuristic may produce a false count. This is unlikely in practice but documented for completeness.

## Run history warning

> **The "Get file content" action loads the entire card file into memory.** This content — including question and answer text — is visible in the Power Automate run history to anyone who can view your flows. The Teams notification itself only shows the count, but the run history retains the raw file content. If your card content is sensitive, be aware of who has access to your Power Automate environment.

## Date comparison logic (critical — get this right)

The comparison must use **local date, not UTC**. Power Automate's internal clock is UTC. You must convert to local time using `convertFromUtc`.

**Expression to get today's local date as YYYY-MM-DD:**

```
formatDateTime(convertFromUtc(utcNow(), 'YOUR_TIMEZONE'), 'yyyy-MM-dd')
```

Replace `YOUR_TIMEZONE` with your Windows timezone ID (e.g., `'Eastern Standard Time'`, `'Pacific Standard Time'`, `'Tokyo Standard Time'`). For the full list of valid timezone IDs, see [Microsoft's timezone documentation](https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/default-time-zones).

**Comparison logic for each card file:**

The flow checks whether `next_review:` value `<=` today's local date. This catches both cards due today AND overdue cards from previous days.

Specifically, after extracting the `next_review` value from the file content:

```
// Extract next_review value (the 10 chars after "next_review: ")
// Compare: if extracted_date <= today_local, card is due

@lessOrEquals(variables('extracted_date'), variables('today_local'))
```

**Do NOT use equality (`equals`).** A user who skips a day would have overdue cards that `equals(today)` would miss.

## What the notification contains

- Count of due cards (e.g., "You have 7 cards due for review")
- The current date

**What it does NOT contain:** card IDs, question text, answer text, ease values, or any content beyond the count. This prevents study content from leaking into Teams.

## Step-by-step build instructions

1. Go to Power Automate → **Create** → **Scheduled cloud flow**.
2. Name it: `LLMwiki — Daily Review Reminder`.
3. Set schedule: repeat every 1 day, at your preferred time.

4. **Initialize variables:**
   - `today_local` (String): `formatDateTime(convertFromUtc(utcNow(), 'YOUR_TIMEZONE'), 'yyyy-MM-dd')`
   - `due_count` (Integer): `0`

5. **Action: SharePoint — Get files (properties only)** in the `/srs/` folder.
   - Site Address: your SharePoint site.
   - Library: your document library.
   - Folder: `/path/to/your/wiki/srs`
   - Filter: `substringof('.yaml', FileLeafRef)` (only YAML files)

6. **Apply to each** file returned:
   a. **Condition:** file name does not start with `.` (skip temp files) AND does not match the SharePoint conflict pattern (no spaces followed by `(` in the filename).
   b. **Action: SharePoint — Get file content** for this file.
   c. **Condition:** check that the file content contains `next_review:`. If not, skip this file (it's malformed).
      - Expression: `contains(outputs('Get_file_content'), 'next_review:')`
   d. **Compose — extract the `next_review` value** using a split/filter approach (safer than fixed-offset substring):
      - First, split the file content by newlines: `split(outputs('Get_file_content'), decodeUriComponent('%0A'))`
      - Then filter for the line containing `next_review:`: use a **Filter array** action where the item `contains(item(), 'next_review:')`.
      - Then extract the date value: `trim(last(split(first(body('Filter_array')), 'next_review:')))`
      - Finally, take only the first 10 characters (the YYYY-MM-DD portion): `substring(outputs('Compose_extract'), 0, 10)`
   e. **Condition:** `@lessOrEquals(outputs('Compose_date'), variables('today_local'))`
      - If yes: increment `due_count` by 1.

7. **After the loop — Condition:** `due_count` > 0.
   - If yes: **Microsoft Teams — Post message**: `"You have @{variables('due_count')} cards due for review today (@{variables('today_local')})."`
   - If no: do nothing (or optionally post "All caught up!").

8. **Save** and **Turn on**.

## Customization

- **Skip weekends:** add a condition checking `dayOfWeek(convertFromUtc(utcNow(), 'YOUR_TIMEZONE'))` — skip if 0 (Sunday) or 6 (Saturday).
- **Threshold:** only notify if `due_count >= 3` to reduce noise for light days.
- **Multiple reminders:** duplicate the flow with different scheduled times for morning and afternoon reminders.
