import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type BunLock,
  cacheKey,
  checkAutolinked,
  lockClosure,
  treeDigest,
  Unsure,
  workflowStep,
} from "./android-apk-cache-key";

const lock = (packages: BunLock["packages"], mobileDeps: Record<string, string>): BunLock => ({
  workspaces: {
    "": { name: "root", dependencies: { unrelated: "1.0.0" } },
    "apps/mobile": {
      name: "@flump/mobile",
      dependencies: mobileDeps,
      devDependencies: { jest: "30.0.0" },
    } as BunLock["workspaces"][string],
    "packages/format": { name: "@flump/format", dependencies: { zod: "4.0.0" } },
  },
  packages,
});

describe("lockClosure", () => {
  const packages: BunLock["packages"] = {
    "@flump/format": ["@flump/format@workspace:packages/format"],
    "react-native": [
      "react-native@0.88.1",
      "",
      {
        dependencies: { "@react-native/gradle-plugin": "0.88.1", semver: "^7" },
        optionalDependencies: { "fsevents-like": "1" },
        peerDependencies: { react: "^19", "@types/react": "^19" },
        optionalPeers: ["@types/react"],
      },
      "sha512-rn",
    ],
    "@react-native/gradle-plugin": ["@react-native/gradle-plugin@0.88.1", "", {}, "sha512-gp"],
    // A non-hoisted version nested under its parent: react-native gets semver 7, others 6.
    semver: ["semver@6.3.2", "", {}, "sha512-s6"],
    "react-native/semver": ["semver@7.7.0", "", {}, "sha512-s7"],
    react: ["react@19.3.1", "", {}, "sha512-react"],
    zod: ["zod@4.6.7", "", {}, "sha512-zod"],
    jest: ["jest@30.0.0", "", {}, "sha512-jest"],
    unrelated: ["unrelated@1.0.0", "", {}, "sha512-u"],
  };

  test("follows dependencies, nested versions, peers and workspace packages, not devDependencies", () => {
    const closure = lockClosure(
      lock(packages, { "react-native": "0.88.1", "@flump/format": "*" }),
      "apps/mobile",
    );
    expect(closure).toEqual([
      "@flump/format=@flump/format@workspace:packages/format",
      "@react-native/gradle-plugin=@react-native/gradle-plugin@0.88.1 sha512-gp",
      "react-native/semver=semver@7.7.0 sha512-s7",
      "react-native=react-native@0.88.1 sha512-rn",
      "react=react@19.3.1 sha512-react",
      "zod=zod@4.6.7 sha512-zod",
    ]);
  });

  test("a changed integrity or version of a native dependency changes the closure", () => {
    const deps = { "react-native": "0.88.1" };
    const before = lockClosure(lock(packages, deps), "apps/mobile");
    const bumped = {
      ...packages,
      "@react-native/gradle-plugin": ["@react-native/gradle-plugin@0.88.2", "", {}, "sha512-gp2"],
    } as BunLock["packages"];
    expect(lockClosure(lock(bumped, deps), "apps/mobile")).not.toEqual(before);
  });

  test("a missing required dependency is unsure, a missing optional one is skipped", () => {
    const { "@react-native/gradle-plugin": _, ...noPlugin } = packages;
    expect(() => lockClosure(lock(noPlugin, { "react-native": "0.88.1" }), "apps/mobile")).toThrow(
      Unsure,
    );
    // fsevents-like (optional) and @types/react (optional peer) are absent: no throw.
    expect(lockClosure(lock(packages, { "react-native": "0.88.1" }), "apps/mobile")).toHaveLength(
      4,
    );
  });

  test("an unknown workspace is unsure", () => {
    expect(() => lockClosure(lock(packages, {}), "apps/nope")).toThrow(Unsure);
  });
});

describe("checkAutolinked", () => {
  const closure = ["expo=expo@58.0.26 sha512-a", "x/expo-crypto=expo-crypto@58.0.8 sha512-b"];

  test("passes when every autolinked module is in the lockfile set at its version", () => {
    expect(() =>
      checkAutolinked(
        [
          { name: "expo", version: "58.0.26" },
          { name: "expo-crypto", version: "58.0.8" },
        ],
        closure,
      ),
    ).not.toThrow();
  });

  test("is unsure for a module outside the set, or at another version", () => {
    expect(() => checkAutolinked([{ name: "expo-camera", version: "1.0.0" }], closure)).toThrow(
      "expo-camera@1.0.0",
    );
    expect(() => checkAutolinked([{ name: "expo", version: "58.0.27" }], closure)).toThrow(Unsure);
  });
});

describe("workflowStep", () => {
  const workflow = `jobs:
  a:
    steps:
      - name: 🤖 Build
        run: |
          ./gradlew one

          ./gradlew two
      - name: Next
        run: echo
  b:
    steps:
      - name: Last
        run: echo last
`;

  test("returns a step's text up to the next step, blank lines inside included", () => {
    expect(workflowStep(workflow, "🤖 Build")).toBe(
      "      - name: 🤖 Build\n        run: |\n          ./gradlew one\n\n          ./gradlew two",
    );
  });

  test("stops at the end of the job", () => {
    expect(workflowStep(workflow, "Next")).toBe("      - name: Next\n        run: echo");
  });

  test("a step that is not there is unsure", () => {
    expect(() => workflowStep(workflow, "Missing")).toThrow(Unsure);
  });
});

describe("treeDigest", () => {
  const tree = () => {
    const dir = mkdtempSync(join(tmpdir(), "prebuild-"));
    mkdirSync(join(dir, "app/src/main"), { recursive: true });
    writeFileSync(join(dir, "app/src/main/AndroidManifest.xml"), "<manifest/>");
    writeFileSync(join(dir, "gradlew"), "#!/bin/sh");
    chmodSync(join(dir, "gradlew"), 0o755);
    return dir;
  };

  test("is the same for the same files and changes with a file's content", () => {
    const a = tree();
    const b = tree();
    expect(treeDigest(a)).toBe(treeDigest(b));
    writeFileSync(join(b, "app/src/main/AndroidManifest.xml"), "<manifest allowBackup/>");
    expect(treeDigest(b)).not.toBe(treeDigest(a));
  });

  test("changes with a new file, a renamed file or an executable bit", () => {
    const a = tree();
    const added = tree();
    writeFileSync(join(added, "app/src/main/extra.xml"), "");
    expect(treeDigest(added)).not.toBe(treeDigest(a));
    const mode = tree();
    chmodSync(join(mode, "gradlew"), 0o644);
    expect(treeDigest(mode)).not.toBe(treeDigest(a));
  });

  test("ignores Gradle's build state and local.properties", () => {
    const a = tree();
    const built = tree();
    mkdirSync(join(built, "app/build/outputs"), { recursive: true });
    writeFileSync(join(built, "app/build/outputs/app-debug.apk"), "apk");
    mkdirSync(join(built, ".gradle"));
    writeFileSync(join(built, ".gradle/state"), "x");
    writeFileSync(join(built, "local.properties"), "sdk.dir=/opt/android");
    expect(treeDigest(built)).toBe(treeDigest(a));
  });

  test("a missing directory is unsure", () => {
    expect(() => treeDigest(join(tmpdir(), "no-such-prebuild-dir"))).toThrow(Unsure);
  });
});

describe("cacheKey", () => {
  const inputs = [
    { label: "apps/mobile/package.json", value: '{"expo":"58.0.26"}' },
    { label: "toolchain", value: "java 17.0.13" },
  ];

  test("is stable for the same inputs and has the versioned prefix", () => {
    expect(cacheKey(inputs)).toBe(cacheKey([...inputs]));
    expect(cacheKey(inputs)).toMatch(/^android-debug-apk-v1-[0-9a-f]{64}$/);
  });

  test("changes when any one input's value or label changes", () => {
    const base = cacheKey(inputs);
    expect(cacheKey([inputs[0], { label: "toolchain", value: "java 17.0.14" }])).not.toBe(base);
    expect(cacheKey([{ ...inputs[0], label: "app.json" }, inputs[1]])).not.toBe(base);
    expect(cacheKey([inputs[0]])).not.toBe(base);
  });

  test("a value cannot move across the boundary into the next label", () => {
    const split = cacheKey([
      { label: "a", value: "x\nb" },
      { label: "c", value: "" },
    ]);
    expect(split).not.toBe(
      cacheKey([
        { label: "a", value: "x" },
        { label: "b\nc", value: "" },
      ]),
    );
  });
});
