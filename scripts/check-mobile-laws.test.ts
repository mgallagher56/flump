/**
 * E12 S1b acceptance 1: under apps/mobile, the law checks fail on a hex colour, an untabulated
 * figure, a tax threshold literal, a mock token, a raw React Native text or pressable, and an API
 * call outside src/data. The real tree passing is `bun run check:laws` and `bun run lint` in CI.
 * Fixtures are built at run time in temp folders (or piped to Biome), never committed.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { countTokenViolations } from "./lib/design-tokens";
import { checkFile } from "./lib/one-tax-engine";
import { collectFiles, MOBILE_SCAN_DIRS, readSource, SCAN_DIRS, UI_SCAN_DIRS } from "./lib/scan";
import { countStyleLiterals } from "./lib/style-literals";
import { needsTabular } from "./lib/tabular-nums";

const repoRoot = resolve(import.meta.dir, "..");
const temps: string[] = [];
afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

function fixtureTree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "mobile-laws-"));
  temps.push(root);
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), content);
  }
  return root;
}

describe("the UI checks scan the mobile app", () => {
  test("UI_SCAN_DIRS is web, marketing and both mobile folders", () => {
    expect(UI_SCAN_DIRS).toEqual([...SCAN_DIRS, "apps/mobile/app", "apps/mobile/src"]);
    expect(MOBILE_SCAN_DIRS).toEqual(["apps/mobile/app", "apps/mobile/src"]);
  });

  test.each([
    "check-design-tokens.ts",
    "check-tabular-nums.ts",
    "check-style-literals.ts",
    "check-react-icons.ts",
    "check-input-types.ts",
  ])("%s collects files from UI_SCAN_DIRS", (script) => {
    const source = readFileSync(resolve(import.meta.dir, script), "utf8");
    expect(source).toContain("collectFiles(repoRoot, UI_SCAN_DIRS)");
    expect(source).not.toContain("collectFiles()");
  });

  test("a mobile screen and route are collected; tests and states files' tests are not", () => {
    const root = fixtureTree({
      "apps/mobile/app/index.tsx": "export default 1;",
      "apps/mobile/src/screens/Home/Home.tsx": "export const a = 1;",
      "apps/mobile/src/screens/Home/Home.test.tsx": "test('x', () => {});",
    });
    expect(collectFiles(root, MOBILE_SCAN_DIRS)).toEqual([
      "apps/mobile/app/index.tsx",
      "apps/mobile/src/screens/Home/Home.tsx",
    ]);
  });
});

describe("each law fails on a mobile fixture", () => {
  test("a hex colour in a mobile style file is a token violation", () => {
    const root = fixtureTree({
      "apps/mobile/src/screens/Home/Home.styles.ts":
        'export const s = { a: { color: "#0b6b5d" }, b: { color: theme.colors.accent } };',
    });
    const [file] = collectFiles(root, MOBILE_SCAN_DIRS);
    expect(countTokenViolations(readSource(root, file as string))).toBe(1);
  });

  test("a figure formatted without tabular numerals fails; fontVariant tabular-nums passes", () => {
    const figure = `import { formatCurrency } from "@flump/format";
      export const A = () => <Text>{formatCurrency(1234)}</Text>;`;
    expect(needsTabular(figure)).toBe(true);
    expect(needsTabular(`${figure}\nconst s = { fontVariant: ["tabular-nums"] };`)).toBe(false);
  });

  test("a raw font size in a mobile style is a style literal; a token text style is not", () => {
    const raw = countStyleLiterals(
      "apps/mobile/src/screens/Home/Home.styles.ts",
      "export const s = { title: { fontSize: 15 }, body: { ...textStyle('body.md') } };",
    );
    expect(raw.fontSize).toBe(1);
    // React Native styles are always passed with style=, so the web inline style rule skips mobile.
    expect(raw.inlineStyle).toBe(0);
  });

  test("a tax threshold literal in a mobile file fails the one tax engine check", () => {
    // 12,570 is the personal allowance; 50,270 the higher rate threshold.
    const found = checkFile(
      "apps/mobile/src/screens/Pay/Pay.tsx",
      "const allowance = 12570; const higher = 50_270;",
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain("reads 2 tax rate or threshold field(s)");
  });

  test("a mock auth token in the mobile app fails check-no-mock-auth", () => {
    const token = ["mock", "session", "token"].join("-");
    const root = fixtureTree({
      "apps/mobile/src/auth/tokenStore.ts": `export const t = "${token}";`,
    });
    const proc = Bun.spawnSync(["bash", resolve(import.meta.dir, "check-no-mock-auth.sh")], {
      env: { ...process.env, SCAN_ROOTS: join(root, "apps") },
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(proc.exitCode).toBe(1);
    expect(proc.stderr.toString()).toContain("apps/mobile/src/auth/tokenStore.ts");
  });
});

/**
 * Lints one source with the repo's biome.json, as if it lived at `path`: the config is copied into
 * a temp tree beside the fixture, so the overrides' globs match exactly as they do in the repo.
 */
function lint(path: string, source: string): { exitCode: number; output: string } {
  const root = fixtureTree({ [path]: source });
  writeFileSync(join(root, "biome.json"), readFileSync(join(repoRoot, "biome.json")));
  // Biome turns on its React Native rules from the nearest package.json, so the app's comes too.
  mkdirSync(join(root, "apps/mobile"), { recursive: true });
  writeFileSync(
    join(root, "apps/mobile/package.json"),
    readFileSync(join(repoRoot, "apps/mobile/package.json")),
  );
  const proc = Bun.spawnSync(
    [
      join(repoRoot, "node_modules/.bin/biome"),
      "lint",
      "--vcs-enabled=false",
      "--max-diagnostics=20",
      path,
    ],
    { cwd: root, stdout: "pipe", stderr: "pipe" },
  );
  return { exitCode: proc.exitCode, output: proc.stdout.toString() + proc.stderr.toString() };
}

describe("Biome: the raw primitives and the data door (apps/mobile)", () => {
  const rawText = `import { Text } from "react-native";\nexport const A = () => <Text>Hi</Text>;\n`;
  const rawPressable = `import { Pressable } from "react-native";\nexport const p = Pressable;\n`;
  const rawInput = `import { TextInput } from "react-native";\nexport const i = TextInput;\n`;
  const view = `import { View } from "react-native";\nexport const v = View;\n`;
  const touchable = (name: string) =>
    `import { ${name} } from "react-native";\nexport const t = ${name};\n`;
  const callXhr = `export const x = () => new XMLHttpRequest();\n`;
  const apiClient = `import { createApiClient } from "@flump/api-client";\nexport const c = createApiClient;\n`;
  const callFetch = `export const load = () => fetch("https://example.test/v1");\n`;
  const fixture = (from: string) =>
    `import { startFixtureServer } from "${from}";\nexport const f = startFixtureServer;\n`;

  test.each([
    ["raw Text in a screen", "apps/mobile/src/screens/Home/Home.tsx", rawText],
    ["raw Pressable in a route", "apps/mobile/app/index.tsx", rawPressable],
    ["raw TextInput in a feature", "apps/mobile/src/features/x/useX.ts", rawInput],
    ["the API client in a screen", "apps/mobile/src/screens/Home/Home.tsx", apiClient],
    ["fetch in a screen", "apps/mobile/src/screens/Home/Home.tsx", callFetch],
    ["the API client in a component", "apps/mobile/src/components/Card/Card.tsx", apiClient],
    ["fetch in a component", "apps/mobile/src/components/Card/Card.tsx", callFetch],
    ["raw Text in the data door", "apps/mobile/src/data/client.ts", rawText],
    ...[
      "Button",
      "TouchableOpacity",
      "TouchableHighlight",
      "TouchableWithoutFeedback",
      "TouchableNativeFeedback",
    ].map((name) => [
      `React Native's ${name} in a screen`,
      "apps/mobile/src/screens/Home/Home.tsx",
      touchable(name),
    ]),
    ["XMLHttpRequest in a screen", "apps/mobile/src/screens/Home/Home.tsx", callXhr],
    [
      "the e2e fixture server in a screen",
      "apps/mobile/src/screens/Home/Home.tsx",
      fixture("../../../e2e/fixture-server/server"),
    ],
    [
      "the e2e fixture server in a route",
      "apps/mobile/app/index.tsx",
      fixture("../e2e/fixture-server"),
    ],
    [
      "the e2e fixture server in a component",
      "apps/mobile/src/components/Card/Card.tsx",
      fixture("../../../e2e/fixture-server/fixtures"),
    ],
    [
      "the e2e fixture server in the data door",
      "apps/mobile/src/data/apiClient.ts",
      fixture("../../e2e/fixture-server/server"),
    ],
  ])("%s fails", (_name, path, source) => {
    const { exitCode, output } = lint(path, source);
    expect(exitCode).not.toBe(0);
    expect(output).toMatch(/noRestrictedImports|noRestrictedGlobals/);
  });

  test.each([
    ["raw Text inside src/components", "apps/mobile/src/components/Text/Text.tsx", rawText],
    ["the API client inside src/data", "apps/mobile/src/data/apiClient.ts", apiClient],
    ["fetch inside src/data", "apps/mobile/src/data/apiClient.ts", callFetch],
    ["other React Native imports in a screen", "apps/mobile/src/screens/Home/Home.tsx", view],
  ])("%s passes", (_name, path, source) => {
    expect(lint(path, source)).toEqual({ exitCode: 0, output: expect.any(String) });
  });

  test("test and story files outside the two folders get no exemption", () => {
    for (const path of [
      "apps/mobile/src/screens/Home/Home.test.tsx",
      "apps/mobile/src/screens/Home/Home.states.ts",
      "apps/mobile/src/screens/Home/Home.stories.tsx",
    ]) {
      expect(lint(path, rawText).exitCode).not.toBe(0);
      expect(lint(path, callFetch).exitCode).not.toBe(0);
    }
  });

  test("each message names what to use instead", () => {
    expect(lint("apps/mobile/src/screens/Home/Home.tsx", rawText).output).toContain(
      "Use Text, Pressable or Button from src/components",
    );
    expect(lint("apps/mobile/src/screens/Home/Home.tsx", apiClient).output).toContain(
      "Use the API client exported by src/data",
    );
    expect(lint("apps/mobile/src/screens/Home/Home.tsx", callFetch).output).toContain(
      "Use the API client exported by src/data",
    );
  });

  test("the overrides relax nothing: raw words inside any component, Button included, still fail", () => {
    const words = `import { View } from "react-native";\nimport { Button } from "../../components/Button";\nexport const A = () => <View><Button>Save</Button></View>;\n`;
    const { exitCode, output } = lint("apps/mobile/src/screens/Home/Home.tsx", words);
    expect(exitCode).not.toBe(0);
    expect(output).toContain("noReactNativeRawText");
    const config = readFileSync(join(repoRoot, "biome.json"), "utf8");
    expect(config).not.toContain('"skip"');
  });

  test("the rules stay inside apps/mobile", () => {
    expect(lint("apps/web/app/features/x/load.ts", callFetch).exitCode).toBe(0);
  });
});
