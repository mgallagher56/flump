#!/usr/bin/env bash
# PreToolUse (matcher Agent|Task|mcp__ccd_session__start_session; other matched tools pass): AGENTS.md section 6 says every
# subagent and session sets its model explicitly, so a spawn with no model is refused (exit 2).
# Passes without a model: an Agent or Task fork (it always runs on the parent's model and ignores
# an override), and start_session calls where model does not apply (a fork, a cloud session, a
# preset, an offer card, a proposal_id). Fails open: if jq is missing or the input cannot be
# read, the call goes ahead. Switch off: delete this hook's PreToolUse entry in
# .claude/settings.json. Tested by scripts/require-model-hook.test.ts.
command -v jq >/dev/null 2>&1 || exit 0
input=$(cat)
tool=$(jq -r '.tool_name // empty' <<<"$input" 2>/dev/null) || exit 0
model=$(jq -r '.tool_input.model // empty' <<<"$input" 2>/dev/null) || exit 0
[ -n "$model" ] && exit 0
case "$tool" in
  Agent|Task)
    subagent=$(jq -r '.tool_input.subagent_type // empty' <<<"$input" 2>/dev/null) || exit 0
    [ "$subagent" = "fork" ] && exit 0 ;;
  mcp__ccd_session__start_session)
    # jq -e: 0 true, 1 false, anything else an error (fail open).
    jq -e '.tool_input | (.proposal_id // "") != "" or .context == "fork" or .target == "cloud"
      or (.preset // "") != "" or .initiation == "offer"' <<<"$input" >/dev/null 2>&1
    [ $? -ne 1 ] && exit 0 ;;
  *) exit 0 ;;
esac
{
  echo "Blocked: $tool was called without a model (AGENTS.md section 6, SUBAGENT MODEL LAW)."
  echo "Set model explicitly by the job: haiku for trivial fully specified work; sonnet for simple"
  echo "tasks, lookups and mechanical edits; opus for code, tests, docs and all code review; fable"
  echo "for plans, specs and complicated decisions. Tiers: docs/agents/subagent-models.md."
} >&2
exit 2
