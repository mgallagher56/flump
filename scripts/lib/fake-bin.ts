import { chmodSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
    const real = Bun.which(tool);
    if (real) symlinkSync(real, join(bin, tool));
  }
  for (const tool of tools) {
    if (tool in fakes) continue;
    const real = Bun.which(tool);
    if (!real) throw new Error(`isolatedPath: the real tool "${tool}" is not installed`);
    symlinkSync(real, join(bin, tool));
  }
  return bin;
}
