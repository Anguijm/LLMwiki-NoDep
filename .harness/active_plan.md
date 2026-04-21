# Active plan — Phase 2d: Power Automate flow documentation

**Status:** draft — awaiting council round 1 + human approval. Not yet executing.
**Branch:** `feat/phase-2d-power-automate-docs`
**Base:** `main` @ `c8557b6` (Phase 2c merged).
**Prior context:** Phases 2a–2c shipped the full read/write wiki app. Phase 2d is the final sub-plan in the Phase 2 series: documentation for Power Automate flows the user can click-build on their locked-down work laptop.

## Scope of Phase 2d

**Governance documentation only.** No code, no HTML, no JavaScript. This phase creates `/power-automate/README.md` and individual flow-description files that document Power Automate for Government flows the user can build in their org's Power Automate environment. The app does not call these flows. The flows do not call the app. They are an adjacent automation layer the user can optionally adopt.

## Why Power Automate

The target user is on a locked-down work laptop with SharePoint sync. Power Automate for Government is typically available in such environments. It can watch the SharePoint-synced folder for file changes and trigger lightweight automations (Teams notifications, email summaries, file moves) without any server, any API key, or any code in the wiki app.

## Deliverables

1. **`/power-automate/README.md`** — overview document:
   - What Power Automate for Government is and how it relates to this wiki.
   - Explicit statement: these flows run on Microsoft infrastructure, not in the browser. The wiki app has no dependency on them.
   - Governance: each flow doc declares its trigger, run frequency estimate, and resource consumption (flow runs, GenAI Action Credits if applicable, Teams notification quota).
   - Anti-scope: no flows that modify wiki content. Flows are read-only observers or notification relays.
   - Link to org's Power Automate for Government admin page (placeholder URL — user fills in their org's).

2. **`/power-automate/new-note-notification.md`** — flow: notify on new note
   - **Trigger:** SharePoint file-created event in the wiki folder (bedrock/, warm/, cold/).
   - **Action:** Post a Teams message (or email) with the note title and tier.
   - **Run frequency:** ~3–5/week (matches note-creation cadence).
   - **Resource cost:** 1 flow run per trigger. No GenAI Action Credits.
   - **Click-build instructions:** step-by-step with screenshots placeholder (user provides their own screenshots since the Power Automate UI varies by org).

3. **`/power-automate/daily-review-reminder.md`** — flow: daily SRS review reminder
   - **Trigger:** Scheduled — daily at a user-configured time (e.g., 8:00 AM local).
   - **Action:** Check if any `/srs/*.yaml` files have `next_review <= today`. If yes, post a Teams message: "You have N cards due for review."
   - **Complexity note:** Power Automate can't natively parse YAML. The flow uses a "Get file content" action and a simple string-contains check for today's date string in `next_review:`. This is a best-effort heuristic, not a parser. Document the limitation.
   - **Run frequency:** 1/day.
   - **Resource cost:** 1 flow run + N file-read actions (one per card). For 100 cards, ~101 actions/day.

4. **`/power-automate/weekly-summary.md`** — flow: weekly wiki activity summary
   - **Trigger:** Scheduled — weekly (e.g., Friday 5:00 PM local).
   - **Action:** Count files modified in the last 7 days across bedrock/, warm/, cold/, srs/. Post a Teams message: "This week: N notes modified, M cards reviewed."
   - **Run frequency:** 1/week.
   - **Resource cost:** 1 flow run + folder-listing actions.

## What Phase 2d explicitly does NOT do

- No code in `index.html`. No HTML, no CSS, no JS changes.
- No flow that writes to wiki files. Flows are read-only or notification-only.
- No flow that calls an external API (no GenAI.mil, no Anthropic, no OpenAI).
- No flow that requires an API key or secret in the Power Automate environment.
- No flow that reads note content or SRS card question/answer text — only metadata (filenames, dates, counts). This prevents PII leakage through Teams notifications.
- No `package.json` or dev tooling (separate PR).

## Security

- **No PII in flow outputs.** Flows only surface metadata: filenames, tier, count, dates. Never note body, SRS question/answer text, tags, or sources. This matches the wiki app's own console-logging policy.
- **No write flows.** Every documented flow is read-only or notification-only. A flow that modifies wiki files would bypass the app's atomic-write and stale-detection safeguards.
- **No secrets.** Flows use SharePoint connector (already authenticated via the user's org account) and Teams connector (same). No API keys stored in the flow.
- **SharePoint permission scope.** Each flow doc states exactly which folders it accesses (e.g., "reads /srs/ only" or "reads bedrock/, warm/, cold/").

## Cost

- **Per-flow run estimates** declared in each flow doc's frontmatter.
- **Org ceiling check:** the README instructs the user to check their org's Power Automate for Government plan limits before enabling flows.
- **No GenAI Action Credits** consumed by any documented flow (no AI Builder actions).

## Accessibility

N/A — this phase is documentation only. No UI changes.

## Execution order (after council + human approval)

Each step = one commit. All land on `feat/phase-2d-power-automate-docs`.

1. `docs: add power-automate/README.md — overview and governance`
2. `docs: add new-note-notification flow doc`
3. `docs: add daily-review-reminder flow doc`
4. `docs: add weekly-summary flow doc`
5. `docs: update top-level README.md status for Phase 2d`

## Risks

1. **Power Automate UI varies by org.** Screenshots can't be provided generically. Each flow doc uses step-by-step text instructions with placeholder notes for where the user should screenshot their own org's UI.
2. **YAML parsing limitation.** The daily-review-reminder flow can't parse YAML natively in Power Automate. The documented heuristic (string-contains for today's date) will false-positive on cards where `next_review` appears elsewhere in the file. Documented as a known limitation.
3. **Org throttling.** Some orgs throttle Power Automate for Government to N runs/day. The README instructs users to check before enabling.

## Success criteria

- `/power-automate/` folder contains README.md + 3 flow docs.
- Each flow doc declares trigger, actions, run frequency, resource cost, and folder scope.
- No flow reads note body, card Q/A, tags, or sources.
- No flow writes to any wiki file.
- No flow requires an API key or secret.
- Council synthesis approves before implementation.
- Human types explicit approval.

## Anti-plan (what failure looks like)

- Adding any JavaScript or HTML changes.
- Documenting a flow that writes to wiki files.
- Documenting a flow that reads note content (not just filenames/metadata).
- Documenting a flow that requires an API key.
- Omitting run-frequency or cost estimates from a flow doc.

## Post-merge cascade

On merge of Phase 2d:
- **Dev tooling PR** (separate branch, separate PR): `package.json` with ESLint, Prettier, test runner. Retroactive automated test coverage.
- Phase 2 is complete. Future work (Phase 3+) is driven by user feedback.
