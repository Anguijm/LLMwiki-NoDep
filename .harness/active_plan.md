# Active plan — Phase 2b: index.html + markdown parser + wiki-link resolver + _index.md regenerator

**Status:** draft — awaiting council round 1 + human approval. Not yet executing.
**Branch:** `feat/phase-2b-index-html`
**Base:** `main` @ `573be91` (Phase 2a merged).
**Prior context:** Phase 2a (folder scaffold, prompt templates, data schemas) is merged. Phase 2b is the first phase that ships executable code — HTML, CSS, and JavaScript in a single `index.html`. The highest-leverage security review of the entire app happens on this PR.

## Scope of Phase 2b

The four product loops — add, link, review, find-contradictions — all require the user to open `index.html` and see their wiki rendered. This phase delivers the read path: open the folder, parse every note, render markdown, resolve wiki links, display backlinks, and regenerate `_index.md`. The write path (SRS review mode, in-app note editing) is Phase 2c.

**Deliverables:**

1. **`index.html`** — a single file containing all HTML, CSS (inline `<style>`), and JavaScript (inline `<script>`). No external assets, no `<script src>`, no `<link rel="stylesheet" href>`. Opens from `file://` in Edge with Wi-Fi off.
2. **Folder access via File System Access API** — `showDirectoryPicker()` to get a read-only directory handle on the wiki root. Drag-drop fallback for browsers that don't support the API or when the user declines.
3. **Frontmatter parser** — parses YAML frontmatter from note markdown per `/docs/data_schemas.md`. Returns structured errors (not booleans) for validation failures. Tolerates BOM, CRLF, mixed line endings.
4. **Inline markdown parser** — converts markdown body to DOM. Escape-by-default: all content goes through `document.createTextNode` / `createElement` / `appendChild`. No `.innerHTML` on untrusted strings. Supports: headings, paragraphs, bold, italic, inline code, code fences, blockquotes, ordered/unordered lists, horizontal rules, links, images, and `[[wiki links]]`.
5. **Wiki-link resolver** — resolves `[[Title]]` to the matching note by Unicode NFKD case-fold title match against the in-memory index. Path-traversal guards per `/docs/data_schemas.md` security considerations. Unresolved links render as visually-distinct broken-link text, not clickable `<a>` tags.
6. **Backlinks panel** — for each rendered note, a sidebar/section showing all notes that link TO this note via `[[wiki links]]`. Computed from the in-memory link graph.
7. **`_index.md` regenerator** — on each folder scan, regenerates `/_index.md` from scratch per the pinned structure in `/docs/data_schemas.md`. Idempotent. Does not read the previous `_index.md` as input. Writes via atomic temp-and-rename.
8. **Broken-notes panel** — notes with parse/validation errors are excluded from the index and rendered in a dedicated "Broken notes" section with the specific error message visible.
9. **SharePoint-sync conflict detection** — files matching `<stem> (1).<ext>` or `<stem> (conflict from <device>).<ext>` patterns are surfaced in UI as "sync conflict — resolve by hand." Not included in the index.
10. **Tier filter** — UI control to filter displayed notes by tier (bedrock / warm / cold / all).

**What Phase 2b explicitly does NOT deliver:**
- No SRS review mode (Phase 2c).
- No SRS card reader/writer (Phase 2c).
- No graph canvas visualization (Phase 2c).
- No in-app note editing or creation (Phase 2c or later).
- No Power Automate flow docs (Phase 2d).
- No `package.json` or dev tooling — tests are manual for this PR. Dev tooling decision deferred to a follow-up.

## Architecture

### Single-file constraint

Everything lives in `index.html`. No ES module imports, no dynamic `import()`, no `<script type="module">` (which has CORS-like restrictions under `file://` in some Chromium builds). All JavaScript is in a single inline `<script>` block at the end of `<body>`.

Logical separation is by named functions and objects, not files:

- `FrontmatterParser` — parse YAML frontmatter, return structured result or structured error.
- `MarkdownParser` — convert markdown string to DOM fragment. Escape-by-default.
- `WikiLinkResolver` — resolve `[[Title]]` tokens during markdown parsing.
- `IndexRegenerator` — produce `_index.md` content from the note array.
- `FolderScanner` — walk the directory handle, read files, coordinate parsing.
- `BacklinkGraph` — compute reverse link index from the parsed notes.
- `UI` — render the note list, note view, broken-notes panel, tier filter, folder-picker.

### Rendering pipeline

```
User grants folder handle
       ↓
FolderScanner walks /bedrock/, /warm/, /cold/
       ↓
For each .md file:
  → FrontmatterParser.parse(content) → { frontmatter, body, errors[] }
  → if errors: push to brokenNotes[]
  → else: push to notes[]
       ↓
Build title→note lookup (Unicode NFKD case-fold)
       ↓
For each note body:
  → MarkdownParser.parse(body, resolver) → DOM fragment
  → WikiLinkResolver resolves [[links]] during parse
       ↓
BacklinkGraph.build(notes) → Map<noteId, backlinks[]>
       ↓
IndexRegenerator.generate(notes) → _index.md content
  → atomic write via directory handle
       ↓
UI.render(notes, brokenNotes, conflictFiles)
```

### File System Access API flow

**Primary path (File System Access API):**
1. On page load, show a "Choose wiki folder" button.
2. `showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' })` — readwrite needed for `_index.md` regeneration. The permission prompt is explicit.
3. Store the handle in a page-scoped variable (not `IndexedDB` — no persistent handle without written rationale per security checklist).
4. If the user revokes permission mid-session or navigates away, surface a "re-grant access" prompt. No crash, no silent failure, no `fetch` fallback.

**Drag-drop fallback:**
1. If `showDirectoryPicker` is unavailable or the user cancels, show a drag-drop zone: "Drag your wiki folder here."
2. Read files from the `DataTransferItemList` via `webkitGetAsEntry()` / `getAsFileSystemHandle()`.
3. Drag-drop is **read-only** — `_index.md` regeneration is skipped (the user must regenerate manually or use a browser that supports the full API). Surface this limitation in UI copy.
4. Drag-drop does NOT get a writable handle, so no SRS writes either (that's Phase 2c anyway).

### Frontmatter parser

Parses the first `---` block at byte offset 0 (after optional BOM strip) per `/docs/data_schemas.md` § "Important parser rule."

- Minimal YAML subset — only needs: string scalars, arrays (flow `[a, b]` and block `- a`), and the exact field set from the schema. No anchors, no aliases, no multi-document, no tags. A full YAML parser is overkill and adds attack surface.
- Returns `{ frontmatter: {...}, body: string, errors: Error[] }`.
- Each error is a structured object per `/docs/data_schemas.md` § "Parser behavior on violations."
- Unknown top-level keys are preserved in the returned frontmatter (for round-trip fidelity in future write paths) but ignored in rendering.

### Markdown parser (escape-by-default)

This is the single highest-risk component. Every code path that turns on-disk content into DOM flows through this parser.

**Supported tokens:**
- Headings (`#` through `######`)
- Paragraphs
- Bold (`**text**`), italic (`*text*`), bold-italic (`***text***`)
- Inline code (`` `code` ``)
- Code fences (` ``` `) — content rendered as preformatted text via `textContent`, never interpreted
- Blockquotes (`> `)
- Ordered lists (`1. `)
- Unordered lists (`- `, `* `, `+ `)
- Horizontal rules (`---`, `***`, `___`)
- Links (`[text](url)`) — URL scheme allowlisted to `http`, `https`, `mailto`, and relative paths. `javascript:`, `data:`, `vbscript:`, `file://` absolute are stripped.
- Images (`![alt](url)`) — same URL scheme allowlist. `data:` blocked.
- Wiki links (`[[Title]]`) — resolved by `WikiLinkResolver`
- Strikethrough (`~~text~~`)

**Explicitly NOT supported (attack-surface reduction):**
- Inline HTML — all `<tags>` in note body render as escaped text. No HTML passthrough.
- HTML entities — rendered literally (e.g., `&amp;` shows as `&amp;`, not `&`). Prevents double-decode XSS.
- Footnotes, definition lists, task lists, tables — deferred. Tables are the most-requested; can be added in a follow-up PR with its own security review.

**DOM construction rules:**
- Every text segment goes through `document.createTextNode()`.
- Every element is built via `document.createElement()` + `appendChild()`.
- No `.innerHTML`, `.outerHTML`, `insertAdjacentHTML`, or `createContextualFragment` on any string derived from note content.
- Link `href` values are set via `element.setAttribute('href', sanitizedUrl)` after scheme allowlist check.
- Image `src` values follow the same rule.

### Wiki-link resolver

- Resolution is by **title match**, not filename match. Titles are compared using Unicode NFKD normalization + case-fold.
- The resolver receives the in-memory title→note map; it never touches the filesystem directly.
- **Path-traversal guards:** targets containing `..`, `/`, `\`, NUL bytes (`\0`), URL-encoded traversal (`%2e%2e`, `%2f`, `%5c`), or absolute-path prefixes (`/`, `C:\`, `~`) are rejected. The `[[link]]` renders as broken-link text.
- **Conflicting titles (two notes with the same case-folded title):** render as a broken link with the message "ambiguous — N notes match this title." The user resolves by renaming one note. No auto-pick by tier or path — that would silently break when the user renames the other note.
- **Self-links:** `[[Title]]` in a note whose own title matches renders as plain text (not a link to self).
- Resolved links are constructed via `document.createElement('a')` — never string-concatenated into HTML.

### Backlinks panel

- After all notes are parsed and wiki links resolved, `BacklinkGraph` inverts the link map: for each note, which other notes link to it?
- The backlinks panel appears below the note body (or in a sidebar — layout TBD in CSS, not an architectural decision).
- Each backlink entry shows the linking note's title as a clickable link.
- Notes with zero backlinks show "No backlinks" (not an empty panel).

### `_index.md` regenerator

- Pure projection: reads the `notes[]` array (already parsed and validated), produces the pinned markdown-table structure per `/docs/data_schemas.md`.
- Rows sorted by `Title` (Unicode case-fold); ties broken by `Path` (ASCII order).
- Broken notes are excluded.
- Idempotent: same input → byte-identical output. No timestamps, no run counters, no randomness.
- Writes via atomic temp-and-rename through the directory handle's writable file handle.
- If the directory handle is read-only (drag-drop fallback), skip regeneration and log a warning to console (no PII in the log — just "skipped _index.md regeneration: read-only handle").

### SharePoint-sync conflict detection

- During folder scan, files matching `<stem> (\d+).<ext>` or `<stem> (conflict from [^)]+).<ext>` are flagged as conflicts.
- Conflict files are NOT parsed as notes. They appear in a "Sync conflicts" UI section with the message "resolve by hand."
- The UI shows the original file and all its conflict siblings together so the user can compare.

### Tier filter

- Three toggle buttons (Bedrock / Warm / Cold) plus an "All" default.
- Filter state is held in a page-scoped variable. No URL hash, no `localStorage`, no persistent state. Refreshing the page resets to "All."
- Filtering hides/shows note entries in the list; it does not re-parse or re-scan.

## CSS / visual design

- Inline `<style>` in `<head>`. No external stylesheet.
- System font stack (`system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`) — no web fonts, no CDN.
- Light theme only (dark theme is a follow-up; `prefers-color-scheme` media query can be added later without architectural changes).
- WCAG AA contrast ratios (4.5:1 body text, 3:1 large text/UI). Specific colors TBD during implementation but the plan commits to AA compliance.
- `prefers-reduced-motion: reduce` — disable any transitions/animations.
- Focus rings visible on all interactive elements (buttons, links, filter toggles). No custom focus style that removes the browser default without replacing it.
- Responsive layout — usable on laptop screens (1024px+). No mobile-first rewrite, but no hard-coded widths that break below 1024px.
- Touch targets ≥ 44×44px for all interactive elements.

## Accessibility

- **Semantic HTML:** `<nav>` for note list, `<main>` for note content, `<aside>` for backlinks, `<button>` for all clickable controls (never `<div onClick>`), `<h1>`–`<h6>` for headings in rendered notes.
- **Keyboard navigation:** all interactive elements reachable via Tab. Logical tab order: folder picker → tier filter → note list → note content → backlinks. No keyboard traps.
- **ARIA live region:** the note content area is an `aria-live="polite"` region so screen readers announce when the displayed note changes.
- **Broken-notes and conflict announcements:** when the broken-notes or sync-conflict panel is non-empty, an `aria-live="assertive"` region announces the count on initial load.
- **Skip link:** a "Skip to content" link as the first focusable element, jumping past the nav/filter to `<main>`.
- **Labels:** the folder-picker button, tier-filter buttons, and any future form inputs all have visible labels or `aria-label`.

## Security

This section restates the security-critical decisions for the council's Security persona. All derive from `/docs/data_schemas.md` and `.harness/scripts/security_checklist.md`.

- **No `.innerHTML` on untrusted strings.** The markdown parser, wiki-link resolver, backlinks panel, broken-notes panel, and index regenerator all construct DOM via `createElement` + `createTextNode` + `appendChild`. This is the single most important invariant in the entire app.
- **URL scheme allowlist.** Links and images: `http`, `https`, `mailto`, relative paths only. `javascript:`, `data:`, `vbscript:`, `file://` absolute → stripped, rendered as plain text.
- **Inline HTML disabled.** Any `<tag>` in markdown body content renders as escaped text. No HTML passthrough in the parser.
- **Wiki-link path-traversal guards.** Resolution by title match only, never by filesystem path. Targets with `..`, `/`, `\`, NUL, URL-encoded traversal, absolute prefixes → rejected.
- **File System Access API scope.** One directory handle for the wiki root. Permission prompt is explicit (`showDirectoryPicker`). No persistent handle in `IndexedDB`. Revocation → graceful re-prompt.
- **No PII in logs.** Console output logs note IDs and error kinds only. No titles, no bodies, no frontmatter values, no file paths containing user identifiers.
- **Atomic writes.** `_index.md` regeneration uses write-to-temp-and-rename. No truncate-and-rewrite.
- **Code fences:** fenced content set via `textContent`, never interpreted regardless of language tag.

## Error handling

| Condition | User-visible behavior |
|---|---|
| No folder selected | Landing page with "Choose wiki folder" button and drag-drop zone |
| Folder selected but empty (no tier folders) | "No notes found. Add markdown files to bedrock/, warm/, or cold/." |
| Permission denied on `showDirectoryPicker` | "Folder access denied. Click to try again, or drag your wiki folder below." |
| Permission revoked mid-session | "Folder access was revoked. Click to re-grant." Disable all controls until re-granted. |
| Note with frontmatter parse error | Note appears in "Broken notes" panel with structured error message. Excluded from index. |
| Note with validation error (e.g., bad tier) | Same as above — broken-notes panel with field-level error. |
| `[[wiki link]]` to nonexistent title | Rendered as visually-distinct broken-link text (e.g., red text with `[broken: Title]`). |
| `[[wiki link]]` with ambiguous match | Rendered as broken-link text: "ambiguous — N notes match." |
| SharePoint conflict file detected | Appears in "Sync conflicts" panel. Not parsed as a note. |
| `_index.md` write fails (permission) | Warning in UI: "Could not update _index.md. Check folder permissions." App continues to function — `_index.md` is a convenience, not a runtime dependency. |
| Very large note (>1MB) | Parse and render. No artificial cap. The parser operates on strings, not streams; a 50MB note may cause a browser jank warning but will not crash. |
| File disappears during scan (SharePoint sync in flight) | Retry once after 200ms per `/docs/data_schemas.md` I/O spec. If still missing, skip with a console warning (no PII). |

## Execution order (after council + human approval)

Each step = one commit. All land on `feat/phase-2b-index-html`. Conventional-commits.

1. `feat: add index.html skeleton with folder picker and CSS`
   - HTML structure: `<header>`, `<nav>`, `<main>`, `<aside>`, skip link.
   - CSS: system fonts, AA-compliant colors, responsive layout, focus rings, reduced-motion.
   - Folder picker button + `showDirectoryPicker()` call.
   - Drag-drop fallback zone.
   - No parsing yet — just the shell.

2. `feat: add frontmatter parser`
   - `FrontmatterParser` object in the `<script>` block.
   - Parses YAML frontmatter per schema. Returns structured errors.
   - BOM stripping, CRLF normalization.
   - Validates all required fields, types, enum values.

3. `feat: add markdown parser with escape-by-default`
   - `MarkdownParser` object.
   - All supported tokens (headings, paragraphs, bold, italic, code, fences, blockquotes, lists, HRs, links, images, strikethrough).
   - Every output path uses `createElement` + `createTextNode`. Zero `.innerHTML`.
   - URL scheme allowlist for links and images.
   - Inline HTML → escaped text.
   - `[[wiki link]]` tokens detected but not yet resolved (placeholder — resolved in step 4).

4. `feat: add wiki-link resolver with path-traversal guards`
   - `WikiLinkResolver` object.
   - Title match via Unicode NFKD case-fold.
   - Path-traversal rejection.
   - Ambiguous-match handling.
   - Self-link handling.
   - Integration with `MarkdownParser` — wiki-link tokens now resolve to `<a>` elements or broken-link text.

5. `feat: add folder scanner and note rendering pipeline`
   - `FolderScanner` walks `/bedrock/`, `/warm/`, `/cold/` via the directory handle.
   - Reads each `.md` file, passes through `FrontmatterParser` + `MarkdownParser`.
   - Builds the note list, broken-notes list, and conflict-files list.
   - `UI.render()` displays notes in the sidebar, renders the first note (or a welcome message if none).
   - SharePoint-sync conflict detection integrated into the scan.

6. `feat: add backlinks panel`
   - `BacklinkGraph` object — inverts the wiki-link map.
   - `<aside>` panel renders backlinks for the currently-displayed note.
   - "No backlinks" message for notes with none.

7. `feat: add _index.md regenerator with atomic write`
   - `IndexRegenerator` object.
   - Produces pinned-structure markdown table from the notes array.
   - Atomic write via temp file + rename through the writable directory handle.
   - Skipped when handle is read-only (drag-drop fallback).
   - Idempotency: same notes → byte-identical output.

8. `feat: add tier filter and broken-notes panel`
   - Tier filter buttons (All / Bedrock / Warm / Cold).
   - Broken-notes panel with structured error display.
   - Sync-conflicts panel.
   - ARIA live regions for panel announcements.

9. `docs: update README.md for Phase 2b`
   - Update setup instructions: "Open `index.html` in Edge."
   - Document the folder-picker flow.
   - Document the drag-drop fallback and its read-only limitation.

10. Reflection block → `.harness/learnings.md` (council-gated per institutional-knowledge rule; posted in a follow-up commit or PR).

## Risks flagged for council round 1

1. **Markdown parser complexity.** A hand-rolled markdown parser is a maintenance risk and a security surface. Mitigation: support a deliberately minimal token set (no tables, no footnotes, no inline HTML). Each token type has a clear code path through `createElement`. The parser is ~300–500 lines, not thousands.

2. **YAML frontmatter parser subset.** A full YAML parser is a large attack surface. The plan calls for a minimal subset (string scalars, arrays, the exact field set). Risk: a user writes valid YAML that the subset parser can't handle (anchors, multi-line strings with `|` or `>`). Mitigation: document the subset explicitly; surface unparseable frontmatter as a broken note with a clear error, not a silent skip.

3. **File System Access API browser support.** The API is Chromium-only (Chrome, Edge, Opera). Firefox and Safari don't support it. Mitigation: drag-drop fallback covers read-only use. The target browser is Edge (per the locked-down laptop constraint), so full API support is guaranteed for the primary user.

4. **`file://` CORS restrictions.** Some Chromium builds restrict `fetch()` and ES module imports under `file://`. Mitigation: no `fetch()`, no ES modules. All code is inline. The only filesystem access is through the File System Access API handle, which is explicitly designed for `file://` use.

5. **Large wikis.** A folder with 1000+ notes will take noticeable time to scan and parse. Mitigation: for Phase 2b, accept the initial scan time (one-time per page load). Progressive rendering or caching is a Phase 2c+ concern if real usage reveals it's needed.

6. **Atomic write under `file://`.** The File System Access API's `createWritable()` + `write()` + `close()` is the atomic primitive. It's not truly atomic in the POSIX `rename()` sense — a crash between `truncate` and `write` can corrupt. Mitigation: write to a `.tmp` sibling first, then rename. The API supports `keepExistingData: false` on `createWritable()`, and we can use a two-step write: create writable on tmp → write → close → rename via `removeEntry` + `moveEntry` if available, or read-back-verify otherwise. Document the limitation.

7. **No automated tests in this PR.** Manual testing only. Risk: regressions on future changes. Mitigation: the dev-tooling decision (test runner, linter) is explicitly deferred. The test seams are designed in (each logical module is a named object with a pure-function interface) so that when a test runner arrives, tests can be bolted on without refactoring.

## Open questions for the council (round 1)

1. **YAML multi-line scalars (`|`, `>`):** should the frontmatter parser support block-scalar syntax for `question` / `answer` fields (relevant when notes have long source lists)? Or is flow-style (`[a, b]`) sufficient and block-scalars are deferred?

2. **Table support in the markdown parser:** tables are useful for study notes but add parser complexity and XSS surface (cell content). Defer to a follow-up PR with its own council review, or include in Phase 2b?

3. **`_index.md` write strategy under the File System Access API:** the API's `createWritable()` truncates on open. Two-step via a `.tmp` file requires either (a) `FileSystemDirectoryHandle.resolve()` + manual rename dance, or (b) writing to the target directly (not truly atomic). Which approach does the council prefer?

4. **Persistent directory handle in `IndexedDB`:** the plan says no (per security checklist). But re-picking the folder on every page load is friction. Should we allow `IndexedDB` handle persistence with a written rationale and a visible "forget this folder" button?

5. **Dev tooling timing:** should Phase 2b include a `package.json` with ESLint + a test runner (e.g., `vitest` or plain Node `assert`) so the parser can be tested before merge? Or is that a separate council-gated PR?

## Success criteria

- `index.html` opens from `file://` in Edge with Wi-Fi off and renders a wiki folder.
- `git grep -n 'innerHTML\|outerHTML\|insertAdjacentHTML\|createContextualFragment'` returns zero matches in `index.html` (except in comments documenting why these are banned).
- Every supported markdown token type renders via DOM construction, not HTML string assembly.
- URL scheme allowlist is enforced: `javascript:`, `data:`, `vbscript:` links render as plain text.
- `[[wiki links]]` resolve by title match; path-traversal payloads render as broken links.
- Backlinks panel shows incoming links for each note.
- `_index.md` is regenerated and byte-identical on repeated runs with the same input.
- Broken notes appear in the broken-notes panel with field-level structured error messages.
- SharePoint conflict files appear in the sync-conflicts panel.
- Tier filter works (All / Bedrock / Warm / Cold).
- Keyboard navigation reaches all interactive elements. Tab order is logical.
- WCAG AA contrast ratios on all text.
- `prefers-reduced-motion` is respected.
- No PII in `console.log` / `console.error` output.
- Council synthesis approves the plan before any implementation commit lands.
- Human types explicit approval after seeing the synthesis.

## Anti-plan (what failure looks like)

- Assigning untrusted content to `.innerHTML` anywhere — instant security veto.
- Adding a `<script src>` or `<link href>` to an external resource — runtime-dep violation.
- Adding `fetch()` or any network call — architecture violation.
- Shipping SRS review mode or card writer — out of scope for Phase 2b.
- Shipping a full YAML parser (js-yaml, etc.) — runtime dep.
- Shipping a full markdown parser (marked, markdown-it, etc.) — runtime dep.
- Storing a persistent `IndexedDB` handle without council approval.
- Skipping the drag-drop fallback — accessibility regression for non-Chromium testers.
- Writing `_index.md` via `innerHTML` string assembly instead of the File System Access API write path.
- Logging note titles, bodies, or frontmatter values to console.

## Post-merge cascade

On approval + merge of Phase 2b:
- **Phase 2c** plan (new session, new branch, new PR). Scope: SRS review mode (read + write per-card YAML via File System Access API with atomic write), SM-2 scheduler, graph canvas visualization with keyboard-navigable outline alternative, in-app note editing (optional, council-gated).
- **Phase 2d** plan: Power Automate flow documentation.
- **Dev tooling PR** (separate from Phase 2c): `package.json` with ESLint, Prettier, test runner. Retroactive test coverage for the Phase 2b parser, resolver, and scanner.
