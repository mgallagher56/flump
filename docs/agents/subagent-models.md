# Subagent models: enforcement detail

The rule itself is [`AGENTS.md`](../../AGENTS.md) section 6. This page holds the detail, moved here on 22 November 2026 to keep `AGENTS.md` short.

Enforcement lives in `.claude/`:

- `.claude/agents/explorer.md` (read-only tools): simple search and investigation.
- `.claude/agents/implementer.md`: writing code, review and complex investigation.
- `.claude/agents/planner.md` (read-only tools): plans, specs and straightforward decisions; prefer this over the built-in `Plan` agent.
- `.claude/agents/decider.md` (read-only tools): complicated decisions.
- Each agent file pins a default `model` in its frontmatter (`explorer` sonnet, `implementer` opus, `planner` fable, `decider` fable, `security-reviewer` and `ui-compliance-reviewer` opus). The default is only a fallback for a spawn that forgot the model; always pass the per-spawn `model` from the tiers above. Three spawns differ from the pinned default: a smaller fix goes to `implementer` with `model: 'sonnet'`; a straightforward decision goes to `planner` with `model: 'opus'`; a trivial search (one known file or command, answer obvious at a glance) goes to `explorer` with `model: 'haiku'`. `security-reviewer` and `ui-compliance-reviewer` always run on `opus`.
- `.claude/settings.json` sets `CLAUDE_CODE_SUBAGENT_MODEL=opus` as the default for any subagent (including built-ins such as `Explore`, `Plan`, `general-purpose`) that has no model of its own.

A per-spawn `model` parameter overrides both frontmatter and the default. In workflow scripts, every `agent()` call must pass `model` (`'haiku'`, `'sonnet'`, `'opus'` for code, review or a straightforward-decision stage, `'fable'` for a plan, spec or complicated-decision stage), including when it also sets `agentType` (`'explorer' | 'implementer' | 'planner' | 'decider' | 'security-reviewer' | 'ui-compliance-reviewer'`).
