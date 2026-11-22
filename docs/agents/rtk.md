# rtk: detail

The rule itself is [`AGENTS.md`](../../AGENTS.md) section 7. This page holds the detail, moved here on 22 November 2026 to keep `AGENTS.md` short.

- The hook only rewrites a command at the start of a line. Inside pipes, loops, subshells, `&&` chains and wrappers it does nothing, so type the prefix yourself there: `for n in 1 2; do rtk gh pr view "$n"; done`, `lockf /tmp/flump-gate.lock rtk bunx vitest run`, `cd <worktree> && rtk git status`. Most misses in the 30-day `rtk discover` scan (33% coverage) were commands after a leading `cd ... &&`.
- The most-missed commands (from `rtk discover`): `git show` (use `rtk git show`), `grep -n` (`rtk grep`), `gh pr` (`rtk gh pr`), `tail`/`cat` on logs (`rtk read` or `rtk log`), `bunx biome` (`rtk bunx biome`), `ls -la` (`rtk ls`), `wc -l` (`rtk wc`).
- To read a file as it is on main, read it in your own up-to-date worktree (rebase first) with the Read tool rather than `git show origin/main:<path>`. Never dump a whole file from another ref: search it with `rtk git grep -n <pattern> <ref> -- <path>`, or take a line range (`rtk git show <ref>:<path> | sed -n '40,80p'`). Whole-file `git show <ref>:<path>` was the largest single waste in the scan.
- When you only need failures, use `rtk err <cmd>` (errors and warnings only) or `rtk test <cmd>` (failing tests only) instead of the full output.
- Run `rtk discover` to see which of your commands missed the proxy.
- Not applicable: interactive commands, long-running dev servers (`bun run dev`, `storybook`), and commands whose raw output is itself the deliverable.
- If a command's compressed output hides something needed (e.g. a full stack trace), use `rtk bypass <cmd>` for the raw output.
- If `rtk` is not installed, install it (`brew install rtk`, or the official install script, which installs to `~/.local/bin` — ensure that is on `PATH`) and run `rtk init -g` for the Claude Code hook; fall back to the plain command only if installation is impossible.

[`rtk`](https://github.com/rtk-ai/rtk) is a CLI proxy that compresses noisy command output (60-90% fewer tokens). When running a command it supports, agents MUST prefix it with `rtk`.

- Applicable: `git` (status, diff, log, ...), `gh`, `bun`/`npm`/`pnpm` scripts (`lint`, `check-types`, `test`, `build`), `tsc`, `vitest`, `playwright`, `docker`, and file/search builtins (`ls`, `grep`, `find`, `cat`/read).
  - Example: `rtk git status`, `rtk bun run test`, `rtk bun run build`.
- The Section 5 pre-flight checks must still be executed and verified; `rtk` only changes how their output is displayed (e.g. `rtk bun run lint`).
