# Active plan — Phase 2c: SRS review mode + outline view

**Status:** revised after council round 1 — awaiting council round 2 + human approval. Not yet executing.
**Branch:** `feat/phase-2c-srs-graph`
**Base:** `main` @ `ec16377` (Phase 2b merged).
**Prior context:** Phase 2b shipped `index.html` with the read path: folder scanning, markdown parsing (escape-by-default), wiki-link resolution, backlinks, `_index.md` regeneration, tier filter. Phase 2c adds the first write path (SRS card updates) and a keyboard-navigable outline view of the knowledge graph.

## Response to council round 1

**Council decision (round 1):** REVISE. Scores: security 4, product 8, bugs 9, accessibility 9, cost 9, architecture 10.

**Accepted revisions:**

1. **SharePoint visibility disclaimer (security blocker).** Add a persistent, user-visible disclaimer to the SRS review UI: "Your review progress is saved to files in the /srs/ folder. This data will be visible to everyone who has access to this SharePoint folder." This addresses the non-negotiable violation.

2. **Defer canvas graph (product).** The canvas-based force-directed graph is premature — high complexity, low Week-1 value. Ship only the keyboard-navigable outline view, which delivers 80% of the "see my connections" value. Canvas graph deferred to a future PR if users request it.

3. **Recalculate "today" per card rating (bugs).** Don't cache today's date at session start. Compute it fresh for each SM-2 calculation to handle midnight-crossing sessions correctly.

4. **YAML block scalars for multiline strings (bugs).** Card writer uses `|` (literal block scalar) for question/answer strings that contain newlines or `---` lines. Prevents YAML document-separator collisions.

5. **Error banners as `role="alert"` (a11y).** Failed-write error banners use `role="alert"` so screen readers announce them immediately.

6. **Orphan cleanup uses relative age (security).** Temp files are deleted based on age relative to `Date.now()` (1 hour threshold), not absolute timestamps. Robust to clock skew.

7. **Specific I/O error messages (bugs).** Differentiate "permission denied," "file locked," "disk full," and "file deleted" in write-failure messages, matching Phase 2b's I/O error differentiation pattern.

8. **Stale-write re-read failure handling (bugs).** If re-reading a stale card also fails, show "Card was updated on another device but could not be reloaded. Skipping." and leave the card in its original state.

**Council answer to approval-gate question:**
- Per-card writes are acceptable for data safety. Batching risks data loss on tab close. Document the sync-traffic behavior in README.

## Scope of Phase 2c (revised)

Two features that serve two of the four product loops:

1. **SRS review mode** — serves the **review** loop. Read per-card YAML from `/srs/`, present due cards, accept ratings, run SM-2, write updated cards back via atomic write-to-temp-and-rename. Includes SharePoint visibility disclaimer.
2. **Outline view** — serves the **link** loop. Keyboard-navigable nested list of notes and their `[[wiki link]]` connections. Default when `prefers-reduced-motion` is active. (Canvas-based graph deferred per product council feedback.)

Both features build on the Phase 2b infrastructure (folder scanner, File System Access API handle, title index, backlink graph).

## Deliverables

### SRS review mode

1. **SRS card parser (`SRSCardParser`)** — reads `/srs/*.yaml` files, parses per-card YAML per `/docs/data_schemas.md` § SRS per-card YAML. Returns structured errors for validation failures. Validates `id` matches filename stem, `ease >= 1.3`, `interval >= 0`, `next_review` is `YYYY-MM-DD` local date, `last_reviewed` is ISO 8601 UTC or absent.

2. **SM-2 scheduler (`SM2Scheduler`)** — pure function implementing the SM-2 algorithm:
   - Input: current `ease`, current `interval`, rating (0–5 scale: Again=0, Hard=3, Good=4, Easy=5).
   - Output: new `ease`, new `interval`, new `next_review` (local calendar date).
   - Clamps `ease` to minimum 1.3.
   - Clamps `interval` to minimum 0.
   - `next_review` computed as today's local date + new interval days. **No UTC conversion.**
   - `last_reviewed` set to current UTC timestamp (`new Date().toISOString()` truncated to seconds + `Z`).

3. **Review queue builder** — filters cards where `next_review <= today` (local date comparison, no timezone conversion). Shuffles due cards. Excludes broken cards and SharePoint conflict files.

4. **Review UI** — accessible from a "Review" button in the app header:
   - Shows card count: "N cards due today."
   - Presents one card at a time: question visible, answer hidden behind a "Show answer" button.
   - After reveal: four rating buttons (Again / Hard / Good / Easy) with keyboard shortcuts (1/2/3/4).
   - After rating: SM-2 runs, card is written atomically, next card appears.
   - During write: all rating buttons disabled (prevents double-click stale-math bug per `/docs/data_schemas.md` § UI concurrency).
   - Session summary at end: "Reviewed N cards. N again, N hard, N good, N easy."
   - "End review" button available at any time to exit early.

5. **SRS card writer (`SRSCardWriter`)** — writes updated card YAML via atomic write-to-temp-and-rename through the `/srs/` directory handle.
   - Uses the same atomic write pattern as Phase 2b's `_index.md` writer.
   - `try...finally` for writable stream cleanup.
   - Stale-write detection: checks `lastModified` before write to detect SharePoint-synced changes.
   - Preserves unknown top-level keys on round-trip.
   - Emits canonical YAML: UTF-8, LF, no BOM.

6. **Broken-cards panel** — cards with parse/validation errors appear in a dedicated "Broken cards" section (separate from the broken-notes panel). Not included in the review queue.

### Outline view

7. **Outline view** — keyboard-navigable view of the knowledge graph (per Phase 2a accessibility carry-forward):
   - A nested list view: each note as a list item, sub-items are its outgoing `[[wiki links]]` (resolved to clickable links where possible, broken-link text where not).
   - Fully keyboard-navigable (arrow keys for navigation, Enter to select a note and navigate to it).
   - Accessible from an "Outline" button in the app header. Replaces the main content area when active. "Back to notes" button returns to the note view.
   - Notes grouped by tier (Bedrock → Warm → Cold) within the outline.
   - Screen-reader friendly: uses semantic `<ul>`/`<li>` elements with `aria-expanded` for collapsible sections.
   - Default view when `prefers-reduced-motion: reduce` is active (instead of requiring the user to toggle).

### Infrastructure additions

10. **Orphan temp cleanup** — on app start, scan `/srs/` (and root) for `.<stem>.<ext>.tmp` files older than 1 hour. Delete each, log count to console (no PII).

11. **SRS conflict detection** — during `/srs/` scan, flag files matching SharePoint conflict patterns. Surface in the broken-cards panel as "sync conflict — resolve by hand."

## Architecture

### SRS data flow

```
App start / Rescan
       ↓
FolderScanner walks /srs/ (new)
       ↓
For each .yaml file:
  → SRSCardParser.parse(content, filename) → { card, errors[] }
  → if errors: push to brokenCards[]
  → else: push to cards[]
       ↓
ReviewQueueBuilder.build(cards, todayLocalDate) → dueCards[]
       ↓
User enters Review mode
       ↓
For each due card:
  → Show question → user clicks "Show answer" → show answer
  → User rates (Again/Hard/Good/Easy)
  → SM2Scheduler.compute(card, rating) → updatedCard
  → SRSCardWriter.write(dirHandle, updatedCard) → atomic write
  → Disable buttons during write → re-enable on success
       ↓
Review complete → summary
```

### SM-2 algorithm (exact specification)

The SM-2 algorithm as originally defined by Piotr Wozniak:

```
Input: ease (float >= 1.3), interval (int >= 0), repetitions (int >= 0), rating (0-5)

If rating >= 3 (correct response):
  If repetitions == 0: interval = 1
  Else if repetitions == 1: interval = 6
  Else: interval = round(interval * ease)
  repetitions += 1
Else (incorrect — rating < 3):
  repetitions = 0
  interval = 1

ease = ease + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
ease = max(ease, 1.3)

next_review = today_local + interval days
last_reviewed = now_utc
```

The `repetitions` field is not in the current card schema. We'll track it in-memory during the review session and derive it from the card's `interval` on load:
- `interval == 0` → `repetitions = 0`
- `interval == 1` → `repetitions = 1`
- `interval > 1` → `repetitions = 2` (any value >= 2 produces the same `interval * ease` formula)

This avoids a schema change while preserving SM-2 correctness.

### Rating mapping

| Button | SM-2 rating | Meaning |
|---|---|---|
| Again | 0 | Complete failure; reset interval |
| Hard | 3 | Correct but with difficulty |
| Good | 4 | Correct with moderate effort |
| Easy | 5 | Effortless recall |

### Outline rendering rules

- All note titles rendered via `textContent` — no `.innerHTML`, no DOM injection from note content.
- Outgoing wiki links rendered as `<a>` elements built via `createElement` (same pattern as Phase 2b backlinks).
- Tier section headers are `<h3>` elements. Notes within each tier are `<ul>`/`<li>`.
- Collapsible sections use `aria-expanded` attribute and toggle on click/Enter/Space.

### SRS YAML serializer

Emits canonical YAML matching the schema exactly:

```yaml
---
id: <id>
question: "<question>"
answer: "<answer>"
ease: <ease>
interval: <interval>
next_review: <YYYY-MM-DD>
last_reviewed: <YYYY-MM-DDTHH:mm:ssZ>
tier: <tier>
source_note: <path>
---
```

- Strings containing newlines or `---` lines use YAML literal block scalar syntax (`|`). This prevents document-separator collisions.
- Single-line strings containing special YAML characters (`"`, `\`, `:`, `#`, `{`, `}`, `[`, `]`, `,`) are double-quoted with internal `"` escaped as `\"` and `\` as `\\`.
- `last_reviewed` key is omitted entirely when the card has never been reviewed (not `null`, not empty string).
- `source_note` key is omitted when absent.
- Unknown keys from the original parse are preserved and re-emitted.

## Security

- **SharePoint visibility disclaimer.** The SRS review UI includes a persistent, visible disclaimer: "Your review progress is saved to files in the /srs/ folder. This data will be visible to everyone who has access to this SharePoint folder." This is the round-1 blocker fix.
- **No `.innerHTML` on SRS card content.** Question and answer text rendered via `textContent` only.
- **No `.innerHTML` on outline labels.** Note titles in the outline rendered via `textContent`.
- **Atomic writes with stale-detection.** SRS card writer checks `lastModified` before writing. Stale writes surface an error, never silently overwrite.
- **UI concurrency lock.** Rating buttons disabled during in-flight writes. Prevents stale-math double-click bug.
- **No PII in logs.** Console logs card IDs only, never question/answer text.
- **Orphan cleanup uses relative age.** Temp files older than 1 hour relative to `Date.now()` — robust to clock skew.
- **Failed-write error banners use `role="alert"`.** Screen readers announce write failures immediately.
- **Local date for `next_review`.** No UTC conversion. Must use:
```javascript
var today = new Date();
var localDate = today.getFullYear() + '-' +
  String(today.getMonth() + 1).padStart(2, '0') + '-' +
  String(today.getDate()).padStart(2, '0');
```
This is load-bearing for SRS correctness. A UTC-based "today" shifts the due date for non-UTC users. **Recalculated per card rating, not cached at session start** (handles midnight-crossing sessions).

## Accessibility

- **Review mode:** all four rating buttons are keyboard-accessible with visible focus rings. Keyboard shortcuts 1/2/3/4 for Again/Hard/Good/Easy. `aria-live="polite"` announces card transitions. Failed-write error banners use `role="alert"` for immediate screen-reader announcement.
- **Outline:** fully keyboard-navigable nested list. Arrow keys for navigation, Enter to select a note. Default view when `prefers-reduced-motion: reduce` is active. Uses semantic `<ul>`/`<li>` with `aria-expanded` for collapsible tier sections.
- **SharePoint disclaimer:** visible in review UI, also accessible to screen readers (not hidden or in a tooltip).
- **WCAG AA contrast** on all new UI elements (rating buttons, outline text, disclaimer).
- **Touch targets >= 44x44px** on rating buttons and outline toggle.

## Error handling

| Condition | User-visible behavior |
|---|---|
| No cards in `/srs/` | Review button shows "0 due" badge. Clicking it shows "No cards found. Create cards using the flashcards prompt template." |
| No cards due today | Review button shows "0 due" badge. Review mode shows "All caught up! No cards due today." |
| Card with parse error | Appears in "Broken cards" panel. Excluded from review queue. |
| Card with SharePoint conflict | Appears in "Broken cards" panel as sync conflict. Excluded from review queue. |
| Write fails (permission denied) | Rating buttons re-enable. Error banner: "Could not save card. Check folder permissions." Card remains in queue at its original state. |
| Write fails (stale — card updated by sync) | Error banner: "This card was updated on another device. Reloading card." Card is re-read from disk and re-presented. |
| Handle revoked mid-review | "Folder access was revoked. Click to re-grant." Review paused. |
| Rating button double-click during write | Buttons disabled; second click has no effect. |

## Execution order (after council + human approval)

Each step = one commit. All land on `feat/phase-2c-srs-graph`.

1. `test: add SRS parser, SM-2, and outline test cases to test.html`
   - SRSCardParser tests: valid/invalid cards, type validation, id-filename mismatch, date parsing, empty/whitespace question/answer, `---` in content
   - SM2Scheduler tests: all rating paths, ease clamping, interval progression, repetition reset
   - SRSCardWriter tests: YAML serialization including special chars, multiline strings, block scalars, round-trip of unknown keys
   - Orphan cleanup tests: relative age calculation, clock-skew safety
   - Local-date utility test: confirms `toISOString().slice(0,10)` anti-pattern is NOT used

2. `feat: add SRS card parser and review queue builder`
   - `SRSCardParser` module in `index.html`
   - `ReviewQueueBuilder` module
   - FolderScanner extended to walk `/srs/`
   - SRS conflict detection (SharePoint conflict files in `/srs/`)

3. `feat: add SM-2 scheduler`
   - `SM2Scheduler` module — pure function, no side effects
   - "Today" computed fresh per call, never cached

4. `feat: add SRS card writer with atomic write and stale detection`
   - `SRSCardWriter` module
   - YAML serializer with block-scalar support for multiline strings
   - Stale-write detection via `lastModified`
   - `try...finally` resource cleanup
   - Differentiated I/O error messages (permission denied, locked, disk full, deleted)

5. `feat: add SRS review mode UI with SharePoint disclaimer`
   - Review button in header with due-count badge
   - **Persistent SharePoint visibility disclaimer** in review UI
   - Card presentation: question → reveal → rate
   - Keyboard shortcuts (1/2/3/4)
   - Write-in-progress button disable
   - Failed-write error banners with `role="alert"`
   - Session summary
   - Broken-cards panel
   - New SRS-specific UI strings added to centralized `STRINGS` object

6. `feat: add outline view for knowledge graph`
   - Nested list view of notes grouped by tier, with outgoing wiki links
   - Keyboard navigation (arrow keys, Enter)
   - "Outline" button in header, "Back to notes" to return
   - Collapsible tier sections with `aria-expanded`
   - Default view when `prefers-reduced-motion` is active

7. `feat: add orphan temp cleanup on app start`
   - Scans `/srs/` and root for `.<stem>.<ext>.tmp` files older than 1 hour (relative age)
   - Deletes each, logs count (no PII)

8. `docs: update README.md for Phase 2c`
   - Document SRS review workflow and SharePoint sync-traffic behavior
   - Document outline view
   - Update status section

## What Phase 2c explicitly does NOT do

- No canvas-based force-directed graph visualization (deferred per product council feedback — ship only the outline view; canvas graph is a future PR if users request it).
- No in-app note creation or editing (deferred — would require a markdown editor, which is a large surface).
- No CSV export of SRS data (if added later, must sanitize formula-leading cells per security checklist).
- No SRS statistics dashboard (cards reviewed per day, streak, etc.) — useful but not in scope.
- No card creation from within the app — cards are created via the `flashcards.md` prompt template.
- No multi-device sync conflict auto-resolution — conflicts are surfaced for manual merge only.
- No review session persistence across tab close (re-derive queue on next load).
- No `package.json` or dev tooling (separate PR per Phase 2b post-merge cascade).

## Risks flagged for council round 2

1. **SM-2 `repetitions` not in schema.** Deriving from `interval` is a lossy approximation, but it is exact for the three states that matter (0, 1, 2+). See Architecture section for rationale.

2. **SRS write frequency.** Each card review triggers a file write. A 50-card review session = 50 writes. SharePoint sync may batch these, but the user might see 50 sync events in their SharePoint activity. Documented in README as expected behavior. Per-card writes chosen over batching for data safety (council round 1 approval-gate answer).

3. **Local date computation.** The plan explicitly flags the `toISOString().slice(0,10)` anti-pattern and specifies the correct local-date computation. Recalculated per card rating, not per session. This is the single most critical correctness requirement in the SRS feature.

4. **YAML block scalars.** The serializer must use `|` (literal block scalar) for strings containing newlines or `---` lines. A bug here would corrupt the card file. Test coverage is mandatory.

## Open questions for the council (round 2)

1. **`repetitions` field:** should we add it to the card schema now (additive, backward-compatible — missing field defaults to derived value), or keep the derived approach?

2. **Card ordering in review:** shuffle? Sort by overdue-ness (most overdue first)? Random?

## Success criteria

- SRS cards in `/srs/*.yaml` are parsed and validated per the schema.
- Due cards (where `next_review <= today`) appear in the review queue.
- Rating a card runs SM-2 and writes the updated card atomically.
- Rating buttons are disabled during writes (no double-click stale-math bug).
- `next_review` is computed as a local calendar date, never through UTC.
- Broken cards and conflict files are surfaced, not silently skipped.
- Knowledge graph renders notes and links visually on canvas.
- Outline alternative is fully keyboard-navigable.
- Outline is the default when `prefers-reduced-motion` is active.
- All new UI elements pass WCAG AA contrast and have 44x44px touch targets.
- Zero `.innerHTML` on card content or graph labels.
- No PII in console logs.
- Council synthesis approves the plan before implementation.
- Human types explicit approval.

## Anti-plan (what failure looks like)

- Using `.innerHTML` to render card question/answer text.
- Converting `next_review` through UTC at any point.
- Using `toISOString().slice(0,10)` for "today's local date."
- Consolidating cards into a bulk file.
- Writing cards without atomic temp-and-rename.
- Allowing double-click during an in-flight write.
- Shipping the outline without keyboard navigation.
- Adding a runtime dependency for the graph (D3, vis.js, etc.).
- Logging card question/answer text to console.
- Auto-deleting SharePoint conflict files.
- Omitting the SharePoint visibility disclaimer from review UI.
- Caching "today" at session start instead of recalculating per rating.

## Post-merge cascade

On approval + merge of Phase 2c:
- **Phase 2d** plan (new session, new branch, new PR): Power Automate flow documentation.
- **Dev tooling PR** (separate): `package.json` with ESLint, Prettier, test runner. Retroactive test coverage for all Phase 2b + 2c modules.
