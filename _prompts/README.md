# `/_prompts/` — GenAI.mil prompt templates

These are the prompts you copy and paste into GenAI.mil. They are the entire "AI layer" of LLMwiki-NoDep — there is no runtime LLM call from the app itself.

Each prompt exists in **two modes**: chat and agent. Both modes produce the same end-state (the same note, the same cards, the same packet). They differ in **how** GenAI.mil produces the output.

## Chat mode vs. agent mode

| Mode | What it is | Pick when |
|---|---|---|
| **chat** | Single GenAI.mil chat turn. You paste a template, fill in your source, and the model returns the full output in one round. Simplest, most inspectable. | Most tasks. Start here unless you have a specific reason to switch. |
| **agent** | GenAI.mil's agent UI: one main agent orchestrates multiple subagents. Each subagent has a focused job (structure detection, summarization, tag extraction, wiki-link matching, etc.). | Large or dense inputs where separating concerns produces measurably better output. Typically lower human-turn cost for big jobs; higher fixed setup cost. |

A prompt's mode is declared in its frontmatter: `mode: chat` or `mode: agent`.

## Available prompts

| Task | Chat mode | Agent mode |
|---|---|---|
| Normalize a source into a single linked note | [`ingest.md`](./ingest.md) | [`ingest-agent.md`](./ingest-agent.md) |
| Inject `[[wiki links]]` into a note | [`linker.md`](./linker.md) | [`linker-agent.md`](./linker-agent.md) |
| Generate SRS cards (optional retention layer) | [`flashcards.md`](./flashcards.md) | [`flashcards-agent.md`](./flashcards-agent.md) |
| Compile a targeted refresher on a topic | [`review-packet.md`](./review-packet.md) | [`review-packet-agent.md`](./review-packet-agent.md) |
| Find contradictions / missing concepts / ambiguities | [`gap-analysis.md`](./gap-analysis.md) | [`gap-analysis-agent.md`](./gap-analysis-agent.md) |

The **large-document chunked ingest** prompt (Milestone 3 of the Phase 3 plan) is agent-only and will land as a separate file — no chat-mode sibling, because the chat-mode paradigm doesn't fit section-by-section orchestration.

## Untrusted content is always treated as data, not instructions

Every prompt — chat and agent — frames pasted source content as untrusted. The canonical framing sentence appears **immediately before** every paste-here placeholder, in both main-agent blocks and subagent blocks. This defends against prompt-injection patterns like "ignore previous instructions" buried in a source document.

For agent-mode prompts, this discipline applies per-subagent: each subagent re-applies the framing immediately before its own input placeholder. Defense in depth: even if one subagent accidentally trusts input, the next one re-frames it.

The Vitest check in `tests/prompts.test.js` enforces this position rule — it will fail CI if a prompt's framing drifts away from the input placeholder.

## Cost kill criterion for agent-mode prompts

Each agent-mode prompt's `human_turn_budget` is calibrated on the assumption that agent orchestration saves paste round-trips vs. its chat-mode sibling for typical inputs. If, after 30 days of real use, an agent-mode prompt's observed average human-turn cost exceeds its chat-mode sibling's, the agent-mode prompt is retired in a follow-up PR. This is the Cost-persona-mandated kill switch from the Phase 3 plan — "we added it; it didn't pay its way; we delete it."

## How to add a new prompt

1. Decide the mode. If you need both, ship the chat mode first — it's cheaper to validate — then add the agent mode as a sibling in a follow-up.
2. Frontmatter MUST include `mode: chat | agent`, `human_turn_budget: <integer>`, and a clear `purpose:`.
3. Every paste-here placeholder (and every per-subagent placeholder in agent mode) MUST be preceded by the canonical framing sentence as the last non-blank line.
4. Add the prompt to the table above.
5. The Vitest check enforces the mode field and framing position; run `npm run test` before committing.
