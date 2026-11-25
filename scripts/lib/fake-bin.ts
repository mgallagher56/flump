import {
  accessSync,
  chmodSync,
  constants,
  mkdirSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";

/**
 * A PATH for a test that runs a script with fake tools. It holds the fakes and symlinks to the
 * named real tools, and nothing else, so a real tool can never answer in place of a fake (a real
 * `docker` sits in /usr/bin on Linux runners, next to bash and sed). Never put a fake directory
 * in front of process.env.PATH: scripts/check-fake-bin-path.ts fails on that.
 *
 *   const PATH = isolatedPath(dir, { fakes: { docker: FAKE_DOCKER }, tools: ["jq"] });
 *
 * The shell and coreutils in BASE_TOOLS are linked whenever they are installed; `tools` names any
 * other real tool the script needs, and a missing one throws.
 *
 * The one implementation for Bun tests (scripts/) and Jest tests on Node (apps/mobile/e2e): it uses
 * Node's fs and path only, no Bun API, so both runtimes import this file.
 */
const BASE_TOOLS = [
  "bash",
  "sh",
  "env",
  "cat",
  "cp",
  "mv",
  "rm",
  "ln",
  "mkdir",
  "mktemp",
  "chmod",
  "touch",
  "ls",
  "date",
  "sleep",
  "seq",
  "basename",
  "dirname",
  "realpath",
  "grep",
  "sed",
  "awk",
  "tr",
  "cut",
  "head",
  "tail",
  "wc",
  "sort",
  "uniq",
  "printf",
  "tee",
  "xargs",
  "stat",
  "sha256sum",
  "shasum",
];

/** The first executable file called `tool` on the given PATH, as `which` finds it. */
export function findOnPath(tool: string, path = process.env.PATH ?? ""): string | null {
  for (const dir of path.split(delimiter)) {
    if (!isAbsolute(dir)) continue;
    const candidate = join(dir, tool);
    try {
      if (!statSync(candidate).isFile()) continue;
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {}
  }
  return null;
}

export function isolatedPath(
  dir: string,
  { fakes = {}, tools = [] }: { fakes?: Record<string, string>; tools?: string[] },
): string {
  const bin = join(dir, "isolated-bin");
  mkdirSync(bin, { recursive: true });
  for (const [name, body] of Object.entries(fakes)) {
    writeFileSync(join(bin, name), body);
    chmodSync(join(bin, name), 0o755);
  }
  for (const tool of BASE_TOOLS) {
    if (tool in fakes || tools.includes(tool)) continue;
    const real = findOnPath(tool);
    if (real) symlinkSync(real, join(bin, tool));
  }
  for (const tool of tools) {
    if (tool in fakes) continue;
    const real = findOnPath(tool);
    if (!real) throw new Error(`isolatedPath: the real tool "${tool}" is not installed`);
    symlinkSync(real, join(bin, tool));
  }
  return bin;
}
