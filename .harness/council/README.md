# Council

Each `*.md` file in this directory (other than this README, `lead-architect.md`, and `repo_context.md`) defines a reviewer persona. The Gemini runner (`../scripts/council.py`) dispatches them in parallel and then runs the Lead Architect synthesis.

## Repo-context anchor

`repo_context.md` is injected as preamble into every persona prompt and the Lead Architect synthesis prompt. It asserts the actual stack / file layout / anti-scope of this repo so personas do not hallucinate (e.g., inferring a Vue + pnpm + `src/lib/` codebase on text-heavy diffs). Update this file whenever the stack materially changes; it is itself council-gated institutional knowledge.

## Active angles

| File | Role | Scope |
|------|------|-------|
| `security.md` | Security Reviewer | XSS via ingested markdown, File System Access API permission scope, SharePoint-sync exposure, prompt-injection in the GenAI.mil paste-back loop, wiki-link path traversal, CSV injection, PII in logs, dev-dep supply chain |
| `architecture.md` | Architecture Reviewer | File-layout contracts (note vs. metadata), the markdown-parser trust boundary, frontmatter schema stability, `srs.csv` schema stability, idempotent `_index.md` regeneration, SharePoint collision handling, backwards-compatible note format, `file://` → DOM invariants |
| `product.md` | Product Reviewer | Single-user value on a locked-down work laptop, anti-scope (no server, no auth, no telemetry, no build pipeline), "under 2 minutes per action" success bar for the core loop |
| `bugs.md` | Bug Hunter | Nulls, races, retries, boundaries, encoding, cleanup, silent failures, SharePoint-sync flakiness, File System Access API edge cases |
| `cost.md` | Cost Reviewer | Human turn budget on GenAI.mil, prompt-template redundancy, context-window discipline in the paste-back loop, any new dev-time API call |
| `accessibility.md` | Accessibility Reviewer | Keyboard, screen reader, WCAG AA, motion, i18n, touch targets |
| `lead-architect.md` | Resolver (synthesizes the above into one plan) |

## Adding a new angle

1. Create `<angle>.md` in this directory following the persona shape in any existing file:
   - One-sentence role statement ("You are a <Role>...").
   - Scope list.
   - Review checklist (numbered questions).
   - Output format (fenced block).
   - Scoring rubric (1–10).
   - Non-negotiables (veto power).
2. The runner auto-picks it up — no code change.
3. Smoke-test by running `python3 ../scripts/council.py --plan .harness/active_plan.md` and confirm the new angle appears in `.harness/last_council.md`.
4. Append the entry to the table above in this README.

## Removing an angle

Delete the file. The runner skips it on the next invocation.

## Disabling an angle temporarily

Rename to `<angle>.md.disabled`. The runner only loads files ending in `.md`.

## Cost cap

The runner enforces 15 Gemini calls per run (hard). Adding a new angle eats one of those slots. If you're near the cap, remove a weaker angle before adding a new one.

## Style invariants for new personas

- No emojis.
- Opening line: `You are a <Role> examining a development plan for LLMwiki-NoDep...`
- Always include non-negotiables that grant veto power (so the Lead Architect knows when to reject).
- Keep the checklist actionable — questions, not lectures.
- Output format must be machine-parseable (fenced block with `Score:` on its own line so the log can extract it).
