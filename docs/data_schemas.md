# Data schemas

Single source of truth for LLMwiki-NoDep's on-disk contracts. If any runtime or prompt-template references a schema rule, it references this file — never restates the rule inline.

Scope:
- Note frontmatter (for markdown files under `/bedrock/`, `/warm/`, `/cold/`).
- SRS per-card YAML (for files under `/srs/`).
- Filename slugging rules (both notes and SRS cards).
- Encoding / line-ending conventions + parser tolerance requirements.
- `/_index.md` pinned structure spec.
- Parser requirements for SharePoint-sync conflict files.
- Security considerations.

Any change to this file is a council-gated schema change per `CLAUDE.md`'s "When to run the council" section.

## Note frontmatter

Every markdown file under `/bedrock/`, `/warm/`, or `/cold/` carries this YAML frontmatter at the top of the file, delimited by `---` lines.

**Important parser rule:** only the **first** `---` block at the start of the file is treated as frontmatter. A `---` line anywhere else in the body (e.g., a horizontal rule, the start of a markdown subsection, a YAML-ish block quoted in prose) is NOT a frontmatter terminator and must be preserved as body content. The parser detects frontmatter only when the file begins with a `---` line at byte offset 0 (after optional UTF-8 BOM), and closes the block on the next line containing only `---`.

```yaml
---
title: Laplace transform pair — sine                     # REQUIRED, non-null, non-empty string
tier: warm                                               # REQUIRED, non-null, one of: bedrock | warm | cold
created: 2026-04-21T14:22:00Z                            # REQUIRED, ISO 8601 UTC timestamp
updated: 2026-04-21T14:22:00Z                            # REQUIRED, ISO 8601 UTC timestamp
tags: [laplace-transforms, signals, control-theory]      # REQUIRED, array; empty [] when none — never omit
sources: [https://example.edu/laplace.pdf, /cold/dsp-review.md]   # OPTIONAL, array only; omit key entirely when none
---
```

### Field reference

| Field | Required | Type | Null/empty policy | Notes |
|---|---|---|---|---|
| `title` | yes | string | non-null, non-empty (trimmed) | Drives `[[wiki link]]` resolution by title (Unicode NFKD case-fold); the filename is derived from this via the slugging rules below. |
| `tier` | yes | enum | non-null; one of `bedrock`, `warm`, `cold` | Drives tier filter state in Phase 2b UI; must match the folder the file lives in (validator surfaces mismatches as broken notes). |
| `created` | yes | ISO 8601 UTC timestamp | non-null | Format exactly `YYYY-MM-DDTHH:mm:ssZ`. Set on first commit of the note; never edited after. |
| `updated` | yes | ISO 8601 UTC timestamp | non-null | Format exactly `YYYY-MM-DDTHH:mm:ssZ`. Updated on any content change. |
| `tags` | yes | array of string | array always present; empty `[]` when no tags | Array form (not comma-string) so the parser never splits. Each entry must be non-empty after trimming; whitespace-only entries are dropped silently by the parser. |
| `sources` | no | array of string | omit the key entirely when no sources | When present, must be an array even for a single element. Each entry is either an absolute URL or a repo-relative path (starting with `/`). |

### Parser behavior on violations

Parse violations produce a **structured error** (not a boolean "broken" flag) so the UI can tell the human exactly what's wrong and which field to fix. Minimum error shape the parser returns per broken note or card:

```json
{
  "path": "warm/laplace-transforms.md",
  "kind": "validation",
  "field": "tier",
  "message": "value 'hot' not in enum [bedrock, warm, cold]",
  "recoverable": true
}
```

| Violation | `field` | `kind` | `message` example | `recoverable` |
|---|---|---|---|---|
| Required field missing | name of the missing field | `validation` | `missing required field 'title'` | `true` |
| `tier` value not in enum | `tier` | `validation` | `value 'hot' not in enum [bedrock, warm, cold]` | `true` |
| `created` / `updated` not parseable as ISO 8601 UTC | `created` or `updated` | `validation` | `not parseable as ISO 8601 UTC: '2026-04-21'` | `true` |
| `tags` / `sources` value not an array | `tags` or `sources` | `validation` | `expected array, got string: 'foo, bar'` | `true` |
| Frontmatter YAML itself unparseable (malformed block) | `(frontmatter)` | `parse` | `YAML parse error at line N: ...` | `true` |
| Body contains LLM-generated timestamp placeholder (`<TIMESTAMP MISSING — human must fill in before save>`) | `created` / `updated` / `next_review` | `validation` | `unfilled LLM placeholder — human must set timestamp` | `true` |
| `tags` contains whitespace-only entries | (none) | `(warning, not error)` | drop silently; surface note | `true` |
| Unknown top-level keys | (none) | `(warning, not error)` | preserve on round-trip; ignore in rendering | `true` |
| File name does not match slug-from-`title` | `title` | `warning` | `filename 'foo.md' does not match slug 'bar' from title` | `true` (still render) |

Notes in validation-error state are **excluded from `/_index.md`, the graph, and SRS outputs** until fixed. They appear in a "Broken notes" section of the UI with the error message visible so the human can edit the offending field. The human decides whether to fix or delete.

### Parser behavior on I/O failures

Distinct from parse/validation errors: I/O errors happen when the filesystem itself refuses to cooperate. The parser must distinguish these cases and return a matching error shape with `kind: "io"`:

| I/O condition | `message` | Recovery action |
|---|---|---|
| File not found | `file not found` | (transient during SharePoint sync; retry once after ~200ms, then surface as broken) |
| Permission denied | `permission denied (check file read permissions)` | surface; require human intervention |
| File locked by another process | `file locked (another application may have it open)` | surface; retry on next user refresh |
| SharePoint-sync conflict file detected (sibling `note (1).md`) | `sync conflict — see also: <sibling path>` | surface both files as "sync conflict — resolve by hand"; do not auto-merge or auto-delete |
| I/O error, unspecified | `io error: <OS message>` | surface with the raw OS message for debugging |

## SRS per-card YAML

Every SRS card is a standalone file at `/srs/<slug>.yaml` with this shape. One file per card — **never** a single bulk file. The one-file-per-card architecture avoids last-write-wins data loss on SharePoint-synced concurrent edits from multiple devices.

```yaml
---
id: 20260421-laplace-transform-pair-sine                 # REQUIRED, must equal filename stem
question: "What is the Laplace transform of sin(at)?"    # REQUIRED, non-empty string
answer: "a / (s^2 + a^2)"                                # REQUIRED, non-empty string
ease: 2.5                                                # REQUIRED, float; SM-2 initial 2.5
interval: 0                                              # REQUIRED, integer days; initial 0
next_review: 2026-04-22                                  # REQUIRED, YYYY-MM-DD LOCAL CALENDAR DATE (not UTC) — WARNING: parse as literal local date; DO NOT convert through UTC (shifts due date for non-UTC users)
last_reviewed: 2026-04-21T14:22:00Z                      # OPTIONAL, ISO 8601 UTC timestamp; omit key when never reviewed
tier: warm                                               # REQUIRED, one of: bedrock | warm | cold
source_note: warm/laplace-transforms.md                  # OPTIONAL, repo-relative path to originating note
---
```

### Field reference

| Field | Required | Type | Null/empty policy | Notes |
|---|---|---|---|---|
| `id` | yes | string | non-null; must equal filename stem | Format: `YYYYMMDD-<slug>`. Uniqueness enforced by the filesystem (two cards can't share a filename). |
| `question` | yes | string | non-null, non-empty (trimmed) | May contain any UTF-8; newlines allowed (YAML block-scalar syntax). |
| `answer` | yes | string | non-null, non-empty (trimmed) | Same rules as `question`. |
| `ease` | yes | float | non-null; `>= 1.3` enforced by SM-2 | SM-2 clamps to 1.3 minimum; initial value 2.5. |
| `interval` | yes | integer | non-null; `>= 0` | Days until next review. `0` means due today. |
| `next_review` | yes | date | non-null; `YYYY-MM-DD` **local-calendar** date | Local date, not UTC. See "Date-field semantics" below. |
| `last_reviewed` | no | ISO 8601 UTC timestamp | omit key when never reviewed | Audit field. UTC timestamp, not a local date. |
| `tier` | yes | enum | non-null; one of `bedrock`, `warm`, `cold` | Matches the originating note's tier (or the tier the user assigned at card creation). |
| `source_note` | no | string | omit key when no originating note | Repo-relative path (starting without a leading `/`). |

### Date-field semantics (important)

- **`next_review` is a local calendar date, not a UTC timestamp.** SRS semantics are "this card is due on day X in the user's calendar." Storing UTC would make a card nominally due `2026-05-01` appear at 5pm April 30 for a UTC-7 user, which is wrong for SRS. The Phase 2c writer must NOT convert `next_review` through a UTC round-trip.
- **`last_reviewed` is a UTC timestamp.** It records the instant the human pressed a review button and should be timezone-unambiguous across devices.
- **All note frontmatter dates (`created`, `updated`) are UTC timestamps.** Same rationale as `last_reviewed`.

### Parser behavior on violations

| Violation | Parser response |
|---|---|
| Required field missing | Surface as a broken card in UI; do not include in review queue; do not auto-delete. |
| `id` does not equal filename stem | Broken card; visible warning. |
| `ease` < 1.3 | Clamp silently to 1.3 on next write. |
| `interval` negative | Clamp silently to 0 on next write. |
| `next_review` not parseable as `YYYY-MM-DD` local-calendar date | Broken card. Do NOT attempt UTC fallback. |
| `last_reviewed` not parseable as ISO 8601 UTC | Broken card. Do NOT attempt local-time fallback. |
| Unknown top-level keys | Preserve on round-trip; ignore in review logic. |

### Future writer requirements (Phase 2c)

- **Atomic write-to-temp-and-rename.** Never truncate-and-rewrite in place. Rename within the same filesystem is atomic on every supported OS; a crash mid-write leaves the original intact.
- **Orphan temp-file cleanup.** On app start, scan `/srs/` for temp files matching a documented pattern (e.g., `.<slug>.yaml.tmp`) and delete. Logged, not silent.
- **No bulk file.** Never consolidate cards into a single `srs.csv`, `srs.yaml`, or equivalent bulk file. That's what the one-file-per-card architecture exists to prevent.
- **CSV-export sanitization (if any CSV export ever exists).** Every cell that starts with `=`, `+`, `-`, `@`, `\t`, or `\r` must be prefixed with `'`. Non-negotiable per `.harness/scripts/security_checklist.md`.

### Global atomic-write requirement (all future writers, not just SRS)

The atomic write-to-temp-and-rename requirement is **global to every future writer in this repo**, not just SRS cards. Any code path that writes a tracked file — note markdown, `/_index.md` regeneration, tier README edits done in-app, Power Automate flow outputs — must use the same write-to-temp-and-rename discipline. Rationale: every tracked file sits in a SharePoint-synced folder, and every in-place truncate-then-write is a crash window that can corrupt the file as far as the sync client sees.

Minimum pattern (pseudocode):

```
def atomic_write(path, content, expected_mtime):
    # 1. Read-before-write: prevent overwriting a newer version that arrived
    #    via SharePoint sync between our initial read and this write.
    current_mtime = path.stat().mtime if path.exists() else None
    if current_mtime is not None and expected_mtime is not None:
        if current_mtime > expected_mtime:
            raise StaleWriteError(path, current_mtime, expected_mtime)
            # UI surfaces: "this file was updated on another device while you
            # were editing. Reload to see the newer version, or discard your
            # changes." Never overwrite silently.

    # 2. Write to temp with canonical encoding/newlines.
    tmp = path.parent / ("." + path.name + ".tmp")
    try:
        tmp.write_text(content, encoding="utf-8", newline="\n")  # LF, no BOM
        tmp.rename(path)                                         # atomic on same fs
    except PermissionError:
        cleanup_temp(tmp)
        raise WritePermissionError(path)    # surface "check folder permissions"
    except FileNotFoundError:
        cleanup_temp(tmp)
        raise WriteTargetDeletedError(path) # surface "file was deleted; save as new?"
    except OSError as e:
        cleanup_temp(tmp)
        if is_stale_handle(e):
            raise HandleRevokedError()      # surface "re-grant folder access"
        raise                               # bubble the OS message
```

Error-handling contract (every writer must distinguish these, not collapse to a generic "save failed"):

| Condition | Specific error | UI response |
|---|---|---|
| File was updated by a sync client since our read | `StaleWriteError` | "This file was updated on another device. Reload to see the newer version, or discard your changes." Offer reload / discard / side-by-side diff. |
| Rename fails (e.g., permission denied on target) | `WritePermissionError` | "Can't save — check folder permissions." Clean up the temp file. |
| Target file was deleted between read and write | `WriteTargetDeletedError` | "File was deleted elsewhere. Save as a new note?" |
| File System Access API handle is stale (user revoked permission mid-session) | `HandleRevokedError` | "Folder access was revoked. Click to re-grant." Do not surface as a generic I/O error. |
| Any other `OSError` | pass through with the raw OS message | "Save failed: `<OS message>`". Do not swallow. |

Orphan cleanup on app start scans every tracked folder (not just `/srs/`) for `.<stem>.<ext>.tmp` files. Log each deletion; never silent. Temp files older than a configurable threshold (default 1 hour) are assumed orphaned from a prior crash.

**UI concurrency (Phase 2c review mode):** the UI must disable interactive controls (review-rating buttons, save buttons) during any in-flight atomic write. A user double-clicking a review button must not queue a second SM-2 update computed against the pre-write in-memory state, as that would overwrite the first update's result with stale math.

## Filename slugging

Applied to both note filenames (from frontmatter `title:`) and SRS card filenames (from YAML `id:` stem).

### Algorithm (deterministic)

1. **Normalize.** Unicode NFKD normalization; strip combining marks (accents).
2. **Downcase.** Convert to lowercase using Unicode case-fold (not locale-specific `toLowerCase()`).
3. **ASCII-only filter.** Any character outside `[a-z0-9]` becomes a hyphen `-`.
4. **Collapse.** Collapse runs of consecutive hyphens to a single hyphen.
5. **Trim.** Strip leading and trailing hyphens.
6. **Empty-stem fallback.** If the stem is empty after step 5 (input was all non-alphanumeric, e.g., `!!?*` or a Japanese title that NFKD-filters to nothing), the caller supplies a Unix timestamp and the stem becomes `untitled-<unix-ts>`. The timestamp is provided by the Phase 2b app from the OS clock OR typed by the human when hand-saving — **never generated by an LLM** (LLMs have no clock and will hallucinate). LLM-emitted notes containing the literal token `<TIMESTAMP MISSING — human must fill in before save>` MUST be rejected by the parser.
7. **Truncate.** If stem length > 80 characters, truncate at the nearest prior hyphen boundary; if no hyphen within the last 20 chars of the truncation point, hard-cut at 80.
8. **Reserved-name escape.** If the resulting stem matches a Windows reserved name (case-insensitive — `CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`), prefix with `_`.
9. **Extension.** `.md` for notes, `.yaml` for SRS cards.

### Collision handling

If the slugged filename already exists in the target folder:
- Second occurrence → append `-2` before the extension (`foo.md` → `foo-2.md`).
- Third → `-3`, etc.
- Authorship order stable: the earlier-created file keeps its unsuffixed name; later files get the suffix.
- The slug's collision counter is scoped to the folder, not the tier or repo.
- If a human hand-renames a file later, the collision counter does not re-renumber — the parser surfaces a warning if slug-from-title no longer matches the filename but continues to render.

**Interaction with SharePoint-sync conflict files.** SharePoint's sync client generates filenames like `foo (1).md` when two devices edit the same file. These are NOT slug-collision suffixes and must not be treated as such.

- Before computing a slug-collision suffix, the slugger skips over any existing files matching the SharePoint conflict-pattern regex (`<stem> \(\d+\)\.<ext>`, or the device-name variant `<stem> \(conflict from [^)]+\)\.<ext>`). Those files are treated as "sibling conflicts to resolve," not as existing slots.
- Result: if `foo.md` exists and SharePoint has also produced `foo (1).md`, a user creating another note titled "Foo" gets `foo-2.md` (the next collision suffix), not `foo (2).md` (which would look like another sync conflict) and not `foo (1)-2.md` (confusing).
- The parser's SharePoint-conflict detector still surfaces `foo (1).md` for manual resolution regardless of what the slugger does.

### Examples

| Title | Slug |
|---|---|
| `Laplace Transform Pair — Sine` | `laplace-transform-pair-sine` |
| `Fourier Series & Parseval's Theorem` | `fourier-series-parsevals-theorem` |
| `CON` | `_con` |
| `Con` (mixed-case reserved name) | `_con` (reserved-name detection is case-insensitive) |
| `Notes 1/2` | `notes-1-2` |
| `<script>alert('xss')</script>` (malicious) | `script-alert-xss-script` — safe as a filename. **Phase 2b parser must also render the `title:` field as escaped text**, never as HTML, so a title like this shows literally in the UI rather than executing. |
| `🤔✅` (all-emoji) | empty stem → fall through to `untitled-<unix-timestamp>` (timestamp supplied by app/human, not LLM) |
| `日本語タイトル` (Japanese title) | (NFKD strips to katakana then filter drops all — result empty; parser falls back to `untitled-<unix-timestamp>`, where the timestamp is generated by the **app / human at save time**, never by an LLM — LLMs have no clock and will hallucinate) |
| `a-very-long-title-that-goes-on-and-on-and-continues-past-the-eighty-character-limit-for-sure` | `a-very-long-title-that-goes-on-and-on-and-continues-past-the-eighty` (truncated at hyphen) |

## Encoding and line endings

**Canonical format for all on-disk files (markdown, YAML, `/_index.md`):**
- UTF-8 encoding.
- LF line endings (`\n`, not `\r\n`).
- No byte-order mark (BOM).

**Parser tolerance (defensive, required in Phase 2b):**
- Accept UTF-8 with or without BOM; strip BOM if present before parsing.
- Accept LF, CRLF, or mixed line endings; normalize to LF on read.
- Accept trailing whitespace on any line.
- On write, always emit canonical LF / no-BOM / UTF-8.

Rationale: SharePoint OneDrive's Windows sync client has been observed to rewrite files with CRLF and/or BOM under some conditions. Intolerance would corrupt notes during sync. Canonical-on-write ensures the repo eventually converges even if one device occasionally re-introduces CRLF/BOM.

## `/_index.md` pinned structure

`/_index.md` is the auto-generated note index. It is regenerated by Phase 2b's `index.html` (not Phase 2a). The Phase 2a stub is an empty placeholder matching this structure so the Phase 2b regenerator has a contract to satisfy.

### Structure (exact)

```markdown
<!-- regenerated by index.html in Phase 2b; pinned structure per /docs/data_schemas.md; do not hand-edit -->

# Index

| Title | Tier | Path | Updated |
|---|---|---|---|
| <title> | <tier> | <repo-relative path> | <YYYY-MM-DD UTC> |
| ... | ... | ... | ... |
```

### Rules

- The header comment is verbatim; the regenerator rewrites it every time.
- The table headers are exactly `Title | Tier | Path | Updated` in that order.
- Rows are sorted by `Title` using Unicode case-fold; ties broken by `Path` (ASCII order).
- `Updated` is the note's `updated:` frontmatter, formatted as `YYYY-MM-DD` UTC (the date portion of the stored ISO timestamp, no time component).
- One row per note that parses successfully. Broken notes are omitted from `_index.md` and surfaced in UI as broken separately.
- Empty index (no notes exist yet) renders the header + comment + empty table (header row + separator row only). The file must never be entirely empty — the pinned structure is always present.

### Regenerator requirements (Phase 2b)

- Recreates `/_index.md` from scratch if the file is missing or unparseable.
- Idempotent: running twice in a row with no note changes produces a byte-identical file.
- Does not read `/_index.md` as input — it's a pure projection of the tier folders' current state.

## SharePoint-sync conflict handling

SharePoint's sync client sometimes generates conflict filenames like `note (1).md`, `note (1).yaml`, `my-note (conflict from DEVICE).md`. These represent real user data that arrived via a sync collision and must not be silently ignored.

### Parser requirements (Phase 2b / Phase 2c)

- Detect filenames matching the patterns `<stem> (1).<ext>`, `<stem> (2).<ext>`, ..., or any SharePoint-characteristic conflict-filename pattern.
- Surface detected conflicts in UI as "sync conflict — resolve by hand." Do not include conflict files in `/_index.md`, the graph, or the SRS review queue until resolved.
- Provide a visible path for the human to open both files side-by-side and manually merge/discard.
- Never auto-delete a conflict file.

## Security considerations

See `.harness/scripts/security_checklist.md` for the full non-negotiables. This section summarizes the schema-adjacent rules so future developers don't miss them.

- **XSS via markdown / frontmatter.** The parser in Phase 2b must escape all on-disk content by default before assigning to the DOM. No `innerHTML` / `outerHTML` / `insertAdjacentHTML` of untrusted strings. Link URL schemes allowlisted to `http`, `https`, `mailto`, and relative paths only — `javascript:`, `data:`, `vbscript:`, `file://` absolute are stripped.
- **Prompt injection via notes.** Every `/_prompts/*.md` template that embeds pasted note content must wrap it in an explicit "untrusted user content" framing block with deterministic delimiters. See the template files for the exact wording.
- **CSV-injection (if CSV export is ever added).** Cells starting with `=`, `+`, `-`, `@`, `\t`, `\r` must be prefixed with `'`. Not a Phase 2a concern; explicitly documented here so Phase 2c doesn't miss it.
- **Path traversal in wiki links.** The wiki-link resolver must not concatenate the link target into a filesystem path. Resolution is by title match against indexed file names, scoped to the granted File System Access API directory handle. Targets containing `..`, `/`, `\`, NUL bytes, URL-encoded traversal, or absolute-path prefixes are rejected or flattened to the literal string before lookup.
- **PII in logs.** No note contents, frontmatter values, wiki-link targets, or SRS question/answer text in `console.log` / `console.error` output. Log card/note IDs only.
