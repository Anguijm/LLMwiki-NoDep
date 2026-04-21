# Active plan — Phase 2c: SRS review mode + knowledge graph

**Status:** draft — awaiting council round 1 + human approval. Not yet executing.
**Branch:** `feat/phase-2c-srs-graph`
**Base:** `main` @ `ec16377` (Phase 2b merged).
**Prior context:** Phase 2b shipped `index.html` with the read path: folder scanning, markdown parsing (escape-by-default), wiki-link resolution, backlinks, `_index.md` regeneration, tier filter. Phase 2c adds the first write path (SRS card updates) and the knowledge graph visualization.

## Scope of Phase 2c

Two features that serve two of the four product loops:

1. **SRS review mode** — serves the **review** loop. Read per-card YAML from `/srs/`, present due cards, accept ratings, run SM-2, write updated cards back via atomic write-to-temp-and-rename.
2. **Knowledge graph** — serves the **link** loop. Visual graph of notes and their `[[wiki link]]` connections, plus a keyboard-navigable outline alternative (per Phase 2a council carry-forward).

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

### Knowledge graph

7. **Graph renderer (`GraphRenderer`)** — visual graph of notes as nodes, `[[wiki links]]` as edges.
   - Renders to a `<canvas>` element using the Canvas 2D API (no WebGL, no runtime dep).
   - Force-directed layout: simple spring-embedder algorithm. Nodes repel, edges attract.
   - Nodes labeled with note title (truncated to 30 chars). Colored by tier (bedrock=blue, warm=orange, cold=gray).
   - Edges drawn as lines between linked nodes.
   - Click a node → navigate to that note in the main view.
   - Pan (drag on background) and zoom (scroll wheel).
   - `prefers-reduced-motion: reduce` → disable animation, show static final layout.

8. **Outline alternative** — keyboard-navigable, non-visual alternative to the graph (per Phase 2a accessibility carry-forward):
   - A nested list view: each note as a list item, sub-items are its outgoing `[[wiki links]]`.
   - Fully keyboard-navigable (arrow keys, Enter to select).
   - Toggle between graph and outline via a button.
   - Screen-reader friendly: the outline is the default for `prefers-reduced-motion: reduce` or when a screen reader is detected.

9. **Graph/outline panel** — accessible from a "Graph" button in the app header. Replaces the main content area when active. "Back to notes" button returns to the note view.

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

### Graph layout algorithm

Simple force-directed layout (no dependency):

```
For N iterations (default 300, or until energy < threshold):
  For each pair of nodes:
    Repulsive force = C_repel / distance^2 (capped to prevent explosion)
  For each edge:
    Attractive force = C_attract * (distance - ideal_length)
  Apply forces to node positions (with damping)
```

For `prefers-reduced-motion`, compute the layout to completion in one frame (no animation), then render the static result.

### Canvas rendering rules

- All text rendered via `ctx.fillText()` — no `.innerHTML`, no DOM injection from note content.
- Node labels are note titles passed through a truncation function, never interpreted as HTML/markup.
- Click detection via coordinate math on the node position array — no DOM event delegation on canvas-internal elements.
- Canvas is focusable (`tabindex="0"`) with keyboard hints overlay ("Click nodes to navigate. Scroll to zoom.").

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

- Strings containing special YAML characters (`"`, `\`, `:`, `#`, `{`, `}`, `[`, `]`, `,`) are double-quoted with internal `"` escaped as `\"` and `\` as `\\`.
- `last_reviewed` key is omitted entirely when the card has never been reviewed (not `null`, not empty string).
- `source_note` key is omitted when absent.
- Unknown keys from the original parse are preserved and re-emitted.

## Security

- **No `.innerHTML` on SRS card content.** Question and answer text rendered via `textContent` only.
- **No `.innerHTML` on graph labels.** Canvas `fillText()` does not interpret HTML.
- **Atomic writes with stale-detection.** SRS card writer checks `lastModified` before writing. Stale writes surface an error, never silently overwrite.
- **UI concurrency lock.** Rating buttons disabled during in-flight writes. Prevents stale-math double-click bug.
- **No PII in logs.** Console logs card IDs only, never question/answer text.
- **Local date for `next_review`.** No UTC conversion. `new Date().toISOString().slice(0, 10)` gives the local date when run in the user's browser.

**Correction on local date:** `new Date().toISOString().slice(0, 10)` gives UTC date, NOT local date. Must use:
```javascript
var today = new Date();
var localDate = today.getFullYear() + '-' +
  String(today.getMonth() + 1).padStart(2, '0') + '-' +
  String(today.getDate()).padStart(2, '0');
```
This is load-bearing for SRS correctness. A UTC-based "today" shifts the due date for non-UTC users.

## Accessibility

- **Review mode:** all four rating buttons are keyboard-accessible with visible focus rings. Keyboard shortcuts 1/2/3/4 for Again/Hard/Good/Easy. `aria-live="polite"` announces card transitions.
- **Graph:** `<canvas>` has `role="img"` and `aria-label="Knowledge graph showing N notes and M connections"`. The outline alternative is the primary accessible path.
- **Outline:** fully keyboard-navigable nested list. Arrow keys for navigation, Enter to select a note. Default view when `prefers-reduced-motion: reduce` is active.
- **Graph/outline toggle:** visible button with `aria-pressed` state.
- **WCAG AA contrast** on all new UI elements (rating buttons, graph legend, outline text).
- **Touch targets >= 44x44px** on rating buttons and graph toggle.

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

1. `test: add SRS parser, SM-2, and graph test cases to test.html`
   - SRSCardParser tests: valid/invalid cards, type validation, id-filename mismatch, date parsing
   - SM2Scheduler tests: all rating paths, ease clamping, interval progression, repetition reset
   - GraphRenderer: not unit-testable (canvas), but layout algorithm tests (force convergence)

2. `feat: add SRS card parser and review queue builder`
   - `SRSCardParser` module in `index.html`
   - `ReviewQueueBuilder` module
   - FolderScanner extended to walk `/srs/`

3. `feat: add SM-2 scheduler`
   - `SM2Scheduler` module — pure function, no side effects

4. `feat: add SRS card writer with atomic write and stale detection`
   - `SRSCardWriter` module
   - YAML serializer with round-trip fidelity
   - Stale-write detection via `lastModified`
   - `try...finally` resource cleanup

5. `feat: add SRS review mode UI`
   - Review button in header with due-count badge
   - Card presentation: question → reveal → rate
   - Keyboard shortcuts (1/2/3/4)
   - Write-in-progress button disable
   - Session summary
   - Broken-cards panel

6. `feat: add knowledge graph with force-directed layout`
   - `GraphRenderer` module
   - Canvas rendering, pan/zoom, click-to-navigate
   - `prefers-reduced-motion` static layout
   - Graph button in header

7. `feat: add outline alternative for knowledge graph`
   - Nested list view of notes and their links
   - Keyboard navigation (arrow keys, Enter)
   - Toggle button between graph and outline
   - Default to outline when `prefers-reduced-motion` or screen reader detected

8. `feat: add orphan temp cleanup on app start`
   - Scans `/srs/` and root for `.<stem>.<ext>.tmp` files older than 1 hour
   - Deletes each, logs count (no PII)

9. `docs: update README.md for Phase 2c`
   - Document SRS review workflow
   - Document knowledge graph and outline toggle
   - Update status section

## What Phase 2c explicitly does NOT do

- No in-app note creation or editing (deferred — would require a markdown editor, which is a large surface).
- No CSV export of SRS data (if added later, must sanitize formula-leading cells per security checklist).
- No SRS statistics dashboard (cards reviewed per day, streak, etc.) — useful but not in scope.
- No card creation from within the app — cards are created via the `flashcards.md` prompt template.
- No multi-device sync conflict auto-resolution — conflicts are surfaced for manual merge only.
- No `package.json` or dev tooling (separate PR per Phase 2b post-merge cascade).

## Risks flagged for council round 1

1. **SM-2 `repetitions` not in schema.** Deriving from `interval` is a lossy approximation: a card that was lapsed and then reviewed once has `interval=1, repetitions=1`, but so does a brand-new card. Both get `interval=6` on next Good rating, which is correct SM-2 behavior, so the approximation is actually exact for the three states that matter (0, 1, 2+).

2. **Canvas accessibility.** The `<canvas>` element is inherently inaccessible to screen readers. Mitigation: the outline alternative is the primary accessible path and the default when `prefers-reduced-motion` is active. The canvas has `role="img"` with a descriptive label.

3. **Force-directed layout performance.** O(N^2) per iteration for repulsive forces. For 100 notes, 300 iterations = 3M force calculations. Should complete in <1 second on modern hardware. For 500+ notes, may need Barnes-Hut approximation — deferred unless real usage reveals the need.

4. **SRS write frequency.** Each card review triggers a file write. A 50-card review session = 50 writes. SharePoint sync may batch these, but the user might see 50 sync events in their SharePoint activity. Documented in the README as expected behavior.

5. **Local date computation.** The plan explicitly flags the `toISOString().slice(0,10)` anti-pattern and specifies the correct local-date computation. This is the single most critical correctness requirement in the SRS feature.

## Open questions for the council

1. **`repetitions` field:** should we add it to the card schema now (additive, backward-compatible — missing field defaults to derived value), or keep the derived approach?

2. **Graph layout algorithm:** simple spring-embedder vs. a more sophisticated algorithm? Spring-embedder is ~50 lines, works for <200 nodes, and has no dependencies.

3. **Review session persistence:** if the user closes the tab mid-review, should in-progress state be saved (e.g., to `sessionStorage`)? Or is it acceptable to lose the position and re-derive the queue on next load?

4. **Card ordering in review:** shuffle? Sort by overdue-ness (most overdue first)? Random?

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
- Shipping the graph without the outline alternative.
- Adding a runtime dependency for the graph (D3, vis.js, etc.).
- Logging card question/answer text to console.
- Auto-deleting SharePoint conflict files.

## Post-merge cascade

On approval + merge of Phase 2c:
- **Phase 2d** plan (new session, new branch, new PR): Power Automate flow documentation.
- **Dev tooling PR** (separate): `package.json` with ESLint, Prettier, test runner. Retroactive test coverage for all Phase 2b + 2c modules.
