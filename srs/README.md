# `/srs/` — spaced-repetition cards (one file per card)

This folder holds the spaced-repetition system data. **Every card is a standalone YAML file at `/srs/<slug>.yaml`.** There is no single bulk file (no `srs.csv`, no `srs.yaml`, no consolidated index). This is a deliberate architectural choice, forced by the deployment environment.

## Why one file per card (not a single CSV / YAML file)

The app runs on a SharePoint-synced folder, potentially across multiple devices. If all cards lived in a single file:

- Two devices add cards at the same time → sync runs → one device's changes overwrite the other's. **Silent data loss.** Last-write-wins.
- One device is offline when the other updates a card → later sync can merge incorrectly or flag the whole file as a conflict, blocking every subsequent write.
- A partial write (crash, permission loss mid-save) can corrupt the entire store — one bad flush kills hundreds of cards.

With one file per card:

- Sync conflicts are scoped to the single card that was edited concurrently — not the whole store.
- An offline device's cards sync individually when it reconnects; conflicts (if any) are visible as SharePoint conflict files (`card-foo (1).yaml`) and must be resolved by hand.
- A partial write corrupts one card, not the whole store.
- Card-level atomicity is what the OS and the sync client naturally provide — we don't fight them.

Trade-off accepted: more inodes, slightly more directory-listing latency on app open. Negligible until you have thousands of cards, and fixable then via pagination or subfolder sharding.

## Schema

Full card schema + nullability rules in `/docs/data_schemas.md`. Summary:

```yaml
---
id: 20260421-laplace-transform-pair-sine
question: "What is the Laplace transform of sin(at)?"
answer: "a / (s^2 + a^2)"
ease: 2.5                  # SM-2 ease factor, initial 2.5
interval: 0                # days; initial 0 (due today)
next_review: 2026-04-22    # YYYY-MM-DD LOCAL calendar date
last_reviewed: null        # ISO 8601 UTC timestamp OR key omitted
tier: warm
source_note: warm/laplace-transforms.md
---
```

Key rule to remember: **`next_review` is a local calendar date, not a UTC timestamp.** SRS semantics are "due on day X in the user's calendar." A UTC conversion would shift the due date for any user not in UTC. See `/docs/data_schemas.md` § Date-field semantics.

## Creating cards

The `/_prompts/flashcards.md` template emits a single card's YAML. The human:

1. Pastes a note's content + the template into GenAI.mil.
2. Gets back one YAML block per card.
3. Saves each as a new file in `/srs/` named after the card's `id:` value plus `.yaml`.

The human can also hand-write a card. Filename must equal `id:` (from the `/docs/data_schemas.md` slugging rules). The app treats hand-written and LLM-generated cards identically.

## Future writer requirements (Phase 2c — not yet implemented)

When Phase 2c adds the in-app SRS review mode (read cards from this folder, update `ease` / `interval` / `next_review` / `last_reviewed` after each review, write back via the File System Access API), those writers must:

- **Use atomic write-to-temp-and-rename.** Write the new card content to a temp file (e.g., `.<slug>.yaml.tmp`), `fsync` if a safety-critical buffer flush is wanted, then rename over the original. Rename within a filesystem is atomic on every OS the target laptop runs. Never truncate-and-rewrite in place.
- **Clean up orphan temp files on app start.** A crash mid-write can leave `.<slug>.yaml.tmp` behind. Scan for these at startup, log them, delete.
- **Never consolidate into a bulk file.** Preserve the one-file-per-card architecture even if a future "export" or "batch update" feature is tempting.
- **Handle SharePoint conflict files.** If a card has a sibling like `card-foo (1).yaml`, surface both in the UI as "sync conflict — resolve by hand." Do not include conflict files in the review queue. Do not auto-delete.

## CSV export — non-negotiable if it ever exists

This folder deliberately has no `srs.csv`. If a future feature (Phase 2c or later) adds a CSV export path for any reason (backup, import into another SRS tool, reporting), that export path **must sanitize formula-leading cells**:

- Every cell whose content starts with `=`, `+`, `-`, `@`, `\t`, or `\r` must be prefixed with `'` (single quote) before being written to the CSV.
- This is a non-negotiable from the council round-2 synthesis on the Phase 2a plan PR and is listed in `.harness/scripts/security_checklist.md` § CSV injection.
- Rationale: CSV cells starting with those characters get interpreted as formulas by Excel / LibreOffice. A card with `question: "=2+2"` would execute on open. Users will open `srs.csv` in Excel; SharePoint makes that one click away.

If a PR adds CSV export without this sanitizer, veto on security grounds.

## Review mode (Phase 2c)

Planned behavior (not yet implemented):

1. App opens → scan `/srs/*.yaml` → build in-memory review queue of cards where `next_review` ≤ today's local date.
2. User reviews cards one at a time, rating each: Again / Hard / Good / Easy (SM-2 semantics).
3. After each rating, SM-2 updates `ease`, `interval`, `next_review`, and `last_reviewed`.
4. Writer atomically persists the card via write-to-temp-and-rename.
5. SharePoint syncs the change (single small file) to other devices.

## Filesystem hygiene

- One `.yaml` file per card. Don't add index files, don't add backup files alongside (use git for that).
- Don't create subfolders inside `/srs/`. The one-file-per-card flat layout is the contract.
- Temp files (`.<slug>.yaml.tmp`) are transient. If you see one that's hours old, delete it — a writer crashed.
- Sync-conflict files (`card-foo (1).yaml`) are real data awaiting manual merge. Resolve, don't delete blindly.
