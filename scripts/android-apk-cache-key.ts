/**
 * The cache key for the e2e debug APK (CI job `🤖 Mobile e2e (Android)`). Run from the repo root
 * after `expo prebuild` has written apps/mobile/android:
 *
 *   bun scripts/android-apk-cache-key.ts
 *
 * The debug APK holds no JavaScript (Metro serves it), so it changes only when a native input
 * changes. A wrong hit would test a stale app against new code, so the key covers every input the
 * Gradle build reads, and anything this script cannot account for gives no key (the job builds):
 *
 * - the prebuild output itself (every file under apps/mobile/android), which already reflects
 *   app.config.ts, config plugins, icons and the prebuild template;
 * - apps/mobile/package.json, the app config (expo-constants embeds it at build time), the root
 *   package.json, bunfig.toml and .node-version;
 * - the lockfile entry (version and integrity) of every package the app depends on, transitively,
 *   through the shared workspace packages too: native modules, Gradle plugins and Hermes included;
 * - this script, the workflow's prebuild and Gradle steps and the Bun setup action;
 * - the JDK (`java -version`), the installed Android build tools, platforms, NDKs and CMake, and
 *   the runner's OS and architecture.
 *
 * As a cross-check, every module Expo and React Native autolinking would build must be in that
 * lockfile set at the same version, or there is no key.
 *
 * Left out on purpose: eas.json (only EAS Build reads it; CI calls Gradle directly), the JavaScript
 * sources and shared packages' code (Metro serves them), devDependencies (Jest and TypeScript are
 * not in the build) and the runner image version (it changes weekly; the tool versions it carries
 * are in the key).
 *
 * Writes `key=` (empty when unsure) and `reason=` to $GITHUB_OUTPUT and the inputs to the job
 * summary. Never fails the job: any error means no key, so the job builds the APK.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";

/** Bump to throw away every cached APK at once. */
const KEY_VERSION = "v1";
/** The workflow steps whose text is part of the key (exact `- name:` values). */
export const KEYED_STEPS = ["🤖 Expo prebuild (Android)", "🤖 Debug APK (Gradle, unless cached)"];
const MOBILE = "apps/mobile";

/** No key: the job builds. */
export class Unsure extends Error {}

const sha = (text: string | Buffer): string => createHash("sha256").update(text).digest("hex");

type LockEntry = [
  spec: string,
  registry?: string,
  info?: {
    dependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalPeers?: string[];
  },
  integrity?: string,
];
interface Workspace {
  name: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}
export interface BunLock {
  workspaces: Record<string, Workspace>;
  packages: Record<string, LockEntry>;
}

/** "a/@s/b/c" -> ["a", "@s/b", "c"]: a scoped name is one segment. */
const segments = (key: string): string[] => {
  const parts = key.split("/");
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    out.push(parts[i].startsWith("@") ? `${parts[i]}/${parts[++i]}` : parts[i]);
  }
  return out;
};

/** Bun's lockfile nests a non-hoisted version under its parent's key: look nearest first. */
const resolveKey = (lock: BunLock, from: string, dep: string): string | undefined => {
  const path = from === "" ? [] : segments(from);
  for (let n = path.length; n >= 0; n--) {
    const key = [...path.slice(0, n), dep].join("/");
    if (lock.packages[key]) return key;
  }
  return undefined;
};

/**
 * Every package the workspace at `dir` depends on at run time, transitively, as sorted
 * "lockKey=name@version integrity" lines. Workspace packages are followed into their own
 * dependencies. A missing required dependency is a lockfile this script does not understand.
 */
export function lockClosure(lock: BunLock, dir: string): string[] {
  const start = lock.workspaces[dir];
  if (!start) throw new Unsure(`bun.lock has no workspace ${dir}`);
  const seen = new Map<string, string>();
  const workspaceDirs = new Map(
    Object.entries(lock.workspaces).map(([wsDir, ws]) => [ws.name, wsDir]),
  );
  const visit = (
    from: string,
    deps: {
      dependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalPeers?: string[];
    },
  ) => {
    const wanted: [string, boolean][] = [
      ...Object.keys(deps.dependencies ?? {}).map((d): [string, boolean] => [d, true]),
      ...Object.keys(deps.optionalDependencies ?? {}).map((d): [string, boolean] => [d, false]),
      // Bun installs a peer next to its dependant whenever the lockfile has it; one it cannot find
      // is left out by Bun too, so it is not part of the build either.
      ...Object.keys(deps.peerDependencies ?? {}).map((d): [string, boolean] => [d, false]),
    ];
    for (const [dep, required] of wanted) {
      const key = resolveKey(lock, from, dep);
      if (!key) {
        if (required) throw new Unsure(`bun.lock does not resolve ${dep} from ${from || dir}`);
        continue;
      }
      if (seen.has(key)) continue;
      const [spec, , info, integrity] = lock.packages[key];
      seen.set(key, `${key}=${spec} ${integrity ?? ""}`.trim());
      const at = spec.lastIndexOf("@");
      if (spec.slice(at + 1).startsWith("workspace:")) {
        const wsDir = workspaceDirs.get(spec.slice(0, at));
        if (!wsDir) throw new Unsure(`bun.lock has no workspace for ${spec}`);
        visit(key, lock.workspaces[wsDir]);
      } else if (info) {
        visit(key, info);
      }
    }
  };
  visit(start.name, start);
  return [...seen.values()].sort();
}

/** Each module autolinking would build must be in the lockfile set at the same version. */
export function checkAutolinked(
  autolinked: readonly { name: string; version: string }[],
  closure: readonly string[],
): void {
  const versions = new Set(closure.map((line) => line.split("=")[1].split(" ")[0]));
  for (const { name, version } of autolinked) {
    if (!versions.has(`${name}@${version}`)) {
      throw new Unsure(`autolinked ${name}@${version} is not in the app's lockfile set`);
    }
  }
}

/** The text of a step, from its `- name:` line to the next step or job. */
export function workflowStep(workflow: string, name: string): string {
  const lines = workflow.split("\n");
  const at = lines.findIndex((l) => l.trim() === `- name: ${name}`);
  if (at === -1) throw new Unsure(`the workflow has no step named ${name}`);
  const indent = lines[at].indexOf("-");
  let end = at + 1;
  while (end < lines.length) {
    const line = lines[end];
    const lead = line.length - line.trimStart().length;
    if (line.trim() !== "" && lead <= indent) break;
    end++;
  }
  return lines.slice(at, end).join("\n").trimEnd();
}

/** Directories under android/ that are build state, not prebuild output. */
const NOT_PREBUILD = new Set(["build", ".gradle", ".cxx", ".kotlin", ".idea"]);

/** One digest of every prebuild file: relative path, executable bit and content. */
export function treeDigest(dir: string): string {
  if (!existsSync(dir)) throw new Unsure(`${dir} does not exist: run expo prebuild first`);
  const hash = createHash("sha256");
  const walk = (at: string) => {
    for (const name of readdirSync(at).sort()) {
      const path = join(at, name);
      const stat = statSync(path);
      if (stat.isDirectory()) {
        if (!NOT_PREBUILD.has(name)) walk(path);
      } else if (name !== "local.properties") {
        const exec = stat.mode & 0o111 ? "x" : "-";
        hash.update(`${relative(dir, path)}\0${exec}\0${sha(readFileSync(path))}\n`);
      }
    }
  };
  walk(dir);
  return hash.digest("hex");
}

export interface KeyInput {
  readonly label: string;
  readonly value: string;
}

/** The key: a fixed prefix and one digest of every labelled input, in order. */
export function cacheKey(inputs: readonly KeyInput[]): string {
  const body = inputs.map((i) => `${i.label}\n${i.value}`).join("\n\0\n");
  return `android-debug-apk-${KEY_VERSION}-${sha(body)}`;
}

const run = (cmd: string, args: string[], cwd?: string): string => {
  const out = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  if (out.status !== 0) throw new Unsure(`${cmd} ${args.join(" ")} failed: ${out.stderr.trim()}`);
  return `${out.stdout}${out.stderr}`;
};

const readOr = (path: string): string => (existsSync(path) ? readFileSync(path, "utf8") : "");

function autolinked(root: string): { name: string; version: string }[] {
  const app = resolve(root, MOBILE);
  const fromExpo = createRequire(
    createRequire(join(app, "package.json")).resolve("expo/package.json"),
  );
  const bin = fromExpo.resolve("expo-modules-autolinking/bin/expo-modules-autolinking.js");
  const expo = JSON.parse(
    run("node", [bin, "resolve", "--platform", "android", "--json"], app),
  ) as {
    modules: { packageName: string; packageVersion: string }[];
  };
  const rn = JSON.parse(
    run("node", [bin, "react-native-config", "--platform", "android", "--json"], app),
  ) as { dependencies: Record<string, { root: string; platforms: { android?: unknown } }> };
  const fromRn = Object.values(rn.dependencies)
    .filter((d) => d.platforms.android)
    .map((d) => JSON.parse(readFileSync(join(d.root, "package.json"), "utf8")))
    .map((p: { name: string; version: string }) => ({ name: p.name, version: p.version }));
  return [
    ...expo.modules.map((m) => ({ name: m.packageName, version: m.packageVersion })),
    ...fromRn,
  ];
}

function toolchain(): string {
  const home = process.env.ANDROID_HOME;
  if (!home) throw new Unsure("ANDROID_HOME is not set");
  const list = (sub: string) =>
    existsSync(join(home, sub)) ? readdirSync(join(home, sub)).sort().join(",") : "(none)";
  return [
    `java: ${run("java", ["-version"]).trim()}`,
    `build-tools: ${list("build-tools")}`,
    `platforms: ${list("platforms")}`,
    `ndk: ${list("ndk")}`,
    `cmake: ${list("cmake")}`,
    `os: ${process.platform} ${process.arch} ${process.env.ImageOS ?? ""}`,
  ].join("\n");
}

/** Every input of the key, in a fixed order. */
export function gatherInputs(root: string): KeyInput[] {
  const file = (p: string): KeyInput => ({ label: p, value: readOr(resolve(root, p)) });
  const app = resolve(root, MOBILE);
  const configs = readdirSync(app)
    .filter((f) => /^app\.(json|config\.(ts|js|mjs|cjs|json))$/.test(f))
    .sort();
  if (configs.length === 0) throw new Unsure(`${MOBILE} has no app config`);
  const lock = Bun.JSONC.parse(readFileSync(resolve(root, "bun.lock"), "utf8")) as BunLock;
  const closure = lockClosure(lock, MOBILE);
  checkAutolinked(autolinked(root), closure);
  const workflow = readFileSync(resolve(root, ".github/workflows/ci-pipeline.yml"), "utf8");
  return [
    { label: "key script", value: readFileSync(import.meta.path, "utf8") },
    ...KEYED_STEPS.map((name) => ({ label: `step ${name}`, value: workflowStep(workflow, name) })),
    file(".github/actions/bun-setup/action.yml"),
    file(`${MOBILE}/package.json`),
    ...configs.map((c) => file(`${MOBILE}/${c}`)),
    file("package.json"),
    file("bunfig.toml"),
    file(".node-version"),
    { label: `bun.lock (${closure.length} packages)`, value: closure.join("\n") },
    { label: `${MOBILE}/android (prebuild output)`, value: treeDigest(join(app, "android")) },
    { label: "toolchain", value: toolchain() },
  ];
}

if (import.meta.main) {
  const output = (line: string) => {
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`);
  };
  const summary = (text: string) => {
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
  };
  try {
    const inputs = gatherInputs(process.cwd());
    const key = cacheKey(inputs);
    output(`key=${key}`);
    const rows = inputs.map((i) => `| ${i.label} | \`${sha(i.value).slice(0, 12)}\` |`);
    summary(
      `### 🔑 Debug APK cache key\n\n\`${key}\`\n\n| Input | sha256 |\n| --- | --- |\n${rows.join("\n")}\n\n`,
    );
    for (const i of inputs) console.log(`${sha(i.value).slice(0, 12)}  ${i.label}`);
    // The toolchain in full: it is read from the runner, not the repo.
    console.log(inputs.find((i) => i.label === "toolchain")?.value);
    console.log(key);
  } catch (error) {
    const reason = (error instanceof Error ? error.message : String(error)).split("\n")[0];
    output("key=");
    output(`reason=${reason}`);
    summary(`### 🔑 Debug APK cache key\n\nNo key, so the APK is built: ${reason}\n\n`);
    console.log(`::warning::No APK cache key, building instead: ${reason}`);
  }
}
