# .harness/

Development framework for LLMwiki-NoDep. This directory is methodology-as-code: a Gemini-powered review council, durable session state, a git hook that captures every commit, and operational runbooks.

Not application code. Safe to delete if you want the project without the harness; the static wiki (`index.html` + the `/_prompts/`, `/bedrock/`, `/warm/`, `/cold/`, `/srs.csv` folder structure) does not depend on it. The harness is dev-time only; it never ships to the SharePoint-synced folder when a user opens the wiki in Edge.

Inspired by:
- **[harness-cli](https://github.com/anguijm/harness-cli)** — multi-persona council pattern.
- **[yolo-projects](https://github.com/anguijm/yolo-projects)** — durable session state, append-only audit log, circuit breaker, model-upgrade discipline.
- **[LLMwiki_StudyGroup](https://github.com/anguijm/llmwiki_studygroup)** — sibling repo where the PR-triggered council workflow, `[skip council]` bypass, institutional-knowledge gating, and "tracked plan" approval gate were forged before being ported here.

## One-time setup

```bash
# 1. Install the Python dependencies for the council runner.
pip install -r .harness/scripts/requirements.txt

# 2. Point your local git at the harness hooks.
bash .harness/scripts/install_hooks.sh

# 3. Export your Gemini API key (add to ~/.zshrc or ~/.bashrc to persist).
export GEMINI_API_KEY="..."
```

Verify:

```bash
git config --get core.hooksPath           # → .harness/hooks
python3 .harness/scripts/council.py -h    # → help text, no import errors
```

## File map

```
.harness/
├── README.md                # this file
├── council/
│   ├── README.md            # how to add/remove angles
│   ├── security.md          # persona: XSS, FS API scope, SharePoint exposure, prompt injection, CSV/path traversal
│   ├── architecture.md      # persona: file-layout contracts, parser boundary, frontmatter/CSV schemas, SharePoint collisions
│   ├── product.md           # persona: single-user locked-down-laptop value; anti-scope (no server/auth/telemetry)
│   ├── bugs.md              # persona: nulls, races, retries, edges, SharePoint-sync flakiness, FS API edge cases
│   ├── cost.md              # persona: human turn budget on GenAI.mil, redundant templates, dev-time API additions
│   ├── accessibility.md     # persona: WCAG AA, keyboard, screen reader
│   └── lead-architect.md    # resolver: synthesizes the six into one plan
├── scripts/
│   ├── council.py           # Gemini council runner (local and CI)
│   ├── install_hooks.sh     # one-time: git config core.hooksPath
│   ├── requirements.txt     # Python deps for council.py
│   └── security_checklist.md# authoritative non-negotiables (loaded by council)
├── hooks/
│   └── post-commit          # auto-updates session_state.json + yolo_log.jsonl
├── memory/                  # session snapshots (agent-written, gitignored contents OK)
│   └── .gitkeep
├── session_state.json       # current state (active plan, focus, last council, last commit)
├── yolo_log.jsonl           # append-only audit trail
├── learnings.md             # human-readable KB (KEEP / IMPROVE / INSIGHT / COUNCIL)
├── model-upgrade-audit.md   # checklist for bumping the Gemini council's model version
├── halt_instructions.md     # how to use the .harness_halt circuit breaker
└── last_council.md          # (created by council.py, gitignored) latest run report
```

## Running the council

On a plan you've drafted:

```bash
# Write your plan (or have the agent write it):
# .harness/active_plan.md

python3 .harness/scripts/council.py --plan .harness/active_plan.md
```

On a working-tree diff (post-implementation review):

```bash
python3 .harness/scripts/council.py --diff                  # vs origin/main
python3 .harness/scripts/council.py --diff --base main      # vs local main
```

Output:
- **stdout** — Lead Architect synthesis printed in full.
- `.harness/last_council.md` — full report (all six critiques + synthesis). Gitignored.
- `.harness/yolo_log.jsonl` — one new line with `{event: "council_run", scores, ...}`.
- `.harness/session_state.json` — `last_council` block updated.

Cost cap: **15 Gemini calls per run** (hard). With the six default personas, each run is 6 calls.

## Durable session state

Three tiers, each optimized for a different consumer:

| File | Reader | Writer | Purpose |
|------|--------|--------|---------|
| `session_state.json` | Agent at session start, council runner, humans | Agent at session end, council runner, post-commit hook | Latest state — current plan, focus, last council, last commit. Overwritten. |
| `yolo_log.jsonl` | Humans browsing history, agent at session start | Council runner, post-commit hook, agent end-of-task | Append-only audit trail. Never overwritten. |
| `learnings.md` | Agent at session start, humans | Agent after each task | Accumulated prose-form knowledge. KEEP / IMPROVE / INSIGHT / COUNCIL blocks. |

### `session_state.json` schema

```json
{
  "schema_version": 1,
  "active_plan": "path/to/active_plan.md | null",
  "focus_area": "short human-readable string",
  "approval_state": "idle | awaiting_approval | approved | in_progress",
  "last_council": {
    "ts": "ISO-8601",
    "source": "PLAN FILE: ... | DIFF vs origin/main",
    "scores": { "security": 9, "architecture": 8, "...": "..." }
  } | null,
  "last_commit": {
    "hash": "...", "short": "...", "subject": "...",
    "author": "...", "branch": "...", "committed_at": "ISO-8601",
    "files_changed": 3
  } | null,
  "notes": "optional freeform field"
}
```

### `yolo_log.jsonl` event shapes

```json
{"ts": "...", "event": "harness_init", "note": "..."}
{"ts": "...", "event": "commit", "commit": { "hash": "...", "short": "...", "subject": "...", ... }}
{"ts": "...", "event": "council_run", "source": "...", "model": "...", "scores": { ... }}
{"ts": "...", "event": "task_complete", "title": "...", "summary": "..."}
```

New event types are fine — keep them flat JSON, one object per line, always with `ts` and `event`.

### Commit-triggered refresh (intentional two-step)

The `post-commit` hook runs on every commit and rewrites `session_state.json` + appends a line to `yolo_log.jsonl`. Because those are tracked files, they show up modified after the commit and land in the *next* commit. This is deliberate — it avoids hook recursion and keeps the log one step behind HEAD, which is exactly what a log should do.

Workflow:

1. You commit code → hook fires → state files updated.
2. Your next commit (code or not) includes the state-file updates alongside whatever else changed.
3. For purely bookkeeping commits, `git commit --allow-empty -m "chore: refresh harness state"` works if you want an isolated state-only commit.

## Council angles

See `council/README.md` for the full list and how to add new ones. Short version:

1. Drop a new `*.md` into `.harness/council/` following the persona shape.
2. Update the table in `council/README.md`.
3. Done — the runner auto-picks it up.

To disable an angle without deleting it, rename `<angle>.md` → `<angle>.md.disabled`.

## Circuit breaker

Write `.harness_halt` at repo root (with a reason). The agent and council both stop. `rm .harness_halt` to resume. Full details in `halt_instructions.md`.

## Model discipline

When you bump the Gemini council's model version (or any future dev-time AI integration), walk `.harness/model-upgrade-audit.md` before merging. The runtime has no model — all "AI" is a human copy/paste loop against GenAI.mil — so "model upgrade" here only ever means dev-time tooling. See that file for the layered checklist.

## What's not here (yet)

- **Quality gates** (`npm run lint` / `npm run test` wrappers for the council to consume). Deferred until the Phase 2 scaffolding lands a dev `package.json`. When they do, they'll live at `.harness/scripts/quality_gates.sh`.
- **Tick/tock hourly cron.** That's a yolo-projects pattern for generating many small apps; this repo is one focused static wiki, so it's the wrong mode.
- **PR watcher (Claude in CI).** The sibling repo has one. We haven't ported it; if we decide we want one, it's a council-gated change, not a silent port.

## Council action (PR-time, GitHub Actions)

In addition to the local Gemini council, every PR triggers `.github/workflows/council.yml`, which runs the same `council.py` against the PR diff and posts the Lead Architect synthesis as a single comment (re-edited on every push, not stacked).

Setup:
- Add `GEMINI_API_KEY` as a repo secret (*Settings → Secrets and variables → Actions → New repository secret*).
- That's it. Opens a PR → action runs → council comment appears in ~60s.

Behavior:
- Runs on `pull_request` opened/synchronize/reopened and on manual `workflow_dispatch`.
- Skipped automatically if `[skip council]` appears in the PR title.
- Skipped automatically for PRs from forks (secrets unavailable to fork PRs by GitHub policy).
- Skipped if `.harness_halt` exists in the PR branch.
- Cost: ~6 Gemini-2.5-pro calls per PR (the runner enforces a 15-call per-run cap, and the workflow enforces a 60-run monthly cap via GitHub Actions cache — state lives outside the repo so a PR cannot reset it). At ~10 PRs/month → $1–3/month.
- Read-only repo permissions: the action does not push state-file updates back to the branch. CI runs are ephemeral; local runs (when you also run `council.py` from your shell) capture state durably.

Relationship to local council:
- **Local council** (`python3 .harness/scripts/council.py --plan ...`): pre-plan, before you write code.
- **Action council** (this workflow): post-PR, against the diff. Read on your phone, type "approved" to the agent, the agent executes.

Both use the same personas in `.harness/council/`. Add a new persona once → it shows up in both.

## Troubleshooting

**"GEMINI_API_KEY not set."** Export it in your shell (`~/.zshrc` or `~/.bashrc`).

**"google-generativeai not installed."** `pip install -r .harness/scripts/requirements.txt` inside the venv you use for this repo.

**Council stuck on one angle.** Each call has 2 retries with exponential backoff. If one angle consistently times out, check Gemini's status page — the script will still produce a report with the failed angle flagged.

**Post-commit hook not running.** Check `git config --get core.hooksPath` prints `.harness/hooks`. If empty, rerun `bash .harness/scripts/install_hooks.sh`.

**Post-commit hook runs but state files don't update.** Check `.harness/hooks/post-commit` is executable (`chmod +x`). Some checkout modes drop the executable bit.
