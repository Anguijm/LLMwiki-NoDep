# Model upgrade audit

LLMwiki-NoDep has **no runtime model**. All "AI" is a human copy/paste loop against GenAI.mil, so there's nothing in `index.html` to upgrade when a provider ships a new version. This checklist covers the two places where a model *does* get named in-repo:

1. **The Gemini council** — the only dev-time AI call this repo makes. It runs in `.github/workflows/council.yml` (PR-triggered) and in `.harness/scripts/council.py` (local fallback). Model ID is a single default inside `council.py` plus an optional `--model` override.
2. **Any future dev-time AI integration** — a second council, an auto-doc generator, a test generator, etc. New additions route through council approval first; once approved, they get audited with this checklist when their model bumps.

A third case to flag: **prompt-template redesigns** (`/_prompts/*.md`). Those target GenAI.mil, which is a black box on our side of the fence — we don't control the model behind it. But a template rewrite that doubles the human's turn budget is effectively a "model swap" from the human's perspective, so the Cost-council angle + the "Post-swap smoke test" below applies in spirit.

Skipping a layer is how silent regressions ship. Walk every layer that applies.

## 1. Config

- [ ] Model ID updated in the single source of truth (`.harness/scripts/council.py` — the `DEFAULT_MODEL` / equivalent constant).
- [ ] No stray references to the old model ID anywhere in the repo. Grep the old ID across `.harness/`, `.github/`, and documentation before committing.
- [ ] If the workflow also pins a model (it shouldn't — the runner owns defaults), update it there too.
- [ ] `.harness/README.md` "Council action" and "Cost" sections reference the new model tier if the tier name is user-facing.

## 2. Callsites

- [ ] Every callsite that used the old model is either migrated or explicitly opted into staying on the old model (with a comment explaining why).
- [ ] SDK parameters still valid against the new model: `max_output_tokens`, `temperature`, `safety_settings`, `system_instruction`, streaming options. (Gemini SDK field names have churned between minor versions.)
- [ ] The `google-generativeai` Python library version pinned in `.harness/scripts/requirements.txt` supports the new model ID. Bump the pin if needed.
- [ ] If the model swap requires a new SDK major version: that's a new supply-chain surface. Route it through Security council.

## 3. Prompts

- [ ] Each persona file in `.harness/council/` still produces the expected output shape. Newer models can be stricter about instruction-following or more verbose.
- [ ] The `Score: <1-10>` extraction in `council.py` still matches the new model's output format (a swing from "Score: 8" to "**Score:** 8/10" will break the parser).
- [ ] The Lead Architect synthesis still returns a single coherent plan, not a list of six individual recommendations.
- [ ] Edge-case inputs (very large diffs, diffs with binary files, plans with embedded code fences) still produce usable output.

## 4. Tests

- [ ] Regression fixtures exist for a representative plan and a representative diff. (If they don't, this is the session to write them.)
- [ ] Run the regression set against the new model; diff outputs against a baseline checked into `.harness/memory/` (or a scratch folder, as long as it's linked from the PR).
- [ ] Manual smoke test: run `council.py --plan .harness/active_plan.md` on a real recent plan and eyeball the synthesis.
- [ ] Manual smoke test: run `council.py --diff` on a real recent working-tree change.

## 5. Costs

- [ ] New model's price-per-input / per-output token documented in a comment near the constant in `council.py`.
- [ ] Per-run cost estimate updated in `.harness/README.md` "Council action" section if it moves by more than 20%.
- [ ] `CALL_CAP` (per-run, in `council.py`) and `MONTHLY_CAP` (per-month, in `.github/workflows/council.yml`) still correct for the new rate limit / pricing combo.
- [ ] If the new model's price-per-token is substantially higher: either lower `MONTHLY_CAP` or get explicit human approval to carry the cost.

## Post-swap smoke test

1. Run the council on a representative PR (or `git diff`) with the old model, save the output to `.harness/memory/pre-swap-council.md`.
2. Swap the model.
3. Run the council again on the same diff; save to `.harness/memory/post-swap-council.md`.
4. Diff the two. Confirm scores and non-negotiables are consistent in direction (±1 per angle is fine; swings of 3+ are a red flag).
5. Spot-check the Lead Architect synthesis — is the framing still useful or has it degraded to generic advice?

## Rollback plan

Every model swap commit must describe how to revert:

- The single config change to revert.
- Any persona-file changes that must be reverted alongside (unusual but possible if output format changed).
- Any `requirements.txt` pin change that must be reverted.

## Never

- Swap model *and* rewrite a persona in the same PR. Split them so regressions can be attributed.
- Swap to a preview / experimental model ID for the default council path. Preview models can be deprecated with short notice; the council is a gate, and a broken gate is worse than no gate.
- Introduce a new dev-time AI integration without a prior council-approved plan. This file audits model *bumps*, not new integrations.
