// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  type NetWorthLeftOut,
  type NetWorthTrendBar,
  selectNetWorthChange,
} from "@flump/finance-engine";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ADD_AN_ESTIMATE,
  ADD_HOME_VALUE_HREF,
  CHANGE_WHAT_COUNTS,
  HOME_VALUE_MISSING_TEXT,
  leftOutSentence,
  NET_WORTH_SETTINGS_HREF,
} from "~/features/accounts/components/NetWorthBasisLine/NetWorthBasisLine";
import { HERO_LABEL, HERO_LABEL_WITH_HOME } from "./components/HomeDashboard/HomeDashboard";
import { barLine, missedLine, trendIntro } from "./components/NetWorthTrendBars/NetWorthTrendBars";
import { netWorthDelta } from "./netWorthDelta";

/**
 * The mobile app's Home hero says what web's Home says (E12 S5, plan 9.8). The app keeps its words
 * in `apps/mobile/src/copy/home.ts`; this test, run by web's suite so a web-only change fails at
 * once, pins them to web's own constants and functions. The mobile files sit outside this project,
 * so they are loaded by path rather than imported (as `mobileNavParity.test.tsx`).
 */
const MOBILE_SRC = new URL("../../../../mobile/src/", import.meta.url);

interface ChangeLine {
  direction: "up" | "down" | "flat";
  text: string;
  spoken: string;
}
interface MobileHome {
  HOME: Record<string, string>;
  leftOutSentence(leftOut: readonly NetWorthLeftOut[]): string;
  changeLine(change: { priorMonth: string; change: number }, currentMonth: string): ChangeLine;
  trendIntro(count: number): string;
  missedLine(missed: NonNullable<NetWorthTrendBar["missedBefore"]>): string;
  barLine(bar: NetWorthTrendBar): string;
}
interface MobileShell {
  ADD_ACCOUNT_WEB_ROUTE: string;
  NET_WORTH_SETTINGS_WEB_ROUTE: string;
  ADD_HOME_VALUE_WEB_ROUTE: string;
}
type IconShape = readonly [string, Readonly<Record<string, string>>];

const load = async <T,>(path: string) =>
  (await import(/* @vite-ignore */ fileURLToPath(new URL(path, MOBILE_SRC)))) as T;

const bar = (over: Partial<NetWorthTrendBar>): NetWorthTrendBar => ({
  month: "2026-10",
  netWorth: 52100,
  latest: false,
  missedBefore: null,
  top: 0,
  height: 100,
  ...over,
});

describe("the mobile Home hero says what web's Home says", () => {
  it("the labels, the empty prompt and the basis line's words", async () => {
    const { HOME } = await load<MobileHome>("copy/home.ts");
    expect(HOME.heroLabel).toBe(HERO_LABEL);
    expect(HOME.heroLabelWithHome).toBe(HERO_LABEL_WITH_HOME);
    expect(HOME.homeValueMissing).toBe(HOME_VALUE_MISSING_TEXT);
    // The app's links open the website until S8 and S9, and say so after web's own words.
    expect(HOME.changeWhatCounts).toBe(`${CHANGE_WHAT_COUNTS} on the website`);
    expect(HOME.addEstimate).toBe(`${ADD_AN_ESTIMATE} on the website`);
    // The hero's empty prompt and action are written inline in HomeDashboard.
    const dashboard = readFileSync(
      new URL("./components/HomeDashboard/HomeDashboard.tsx", import.meta.url),
      "utf8",
    );
    expect(dashboard).toContain(`emptyPrompt="${HOME.emptyPrompt}"`);
    expect(dashboard).toContain(">Add an account</SampleAwareLink>");
    expect(HOME.addAccount).toBe("Add an account on the website");
  });

  it.each([
    [[]],
    [["studentLoan"]],
    [["property", "mortgage"]],
    [["property", "mortgage", "studentLoan"]],
  ] as const)("the leave-out sentence for %j", async (leftOut) => {
    const mobile = await load<MobileHome>("copy/home.ts");
    expect(mobile.leftOutSentence(leftOut)).toBe(leftOutSentence(leftOut));
  });

  it.each([
    [52100, 51780, "2026-10", "2026-11"],
    [51780, 52100, "2026-10", "2026-11"],
    [-6400, -5150, "2025-12", "2026-01"],
    [52100.4, 52099.6, "2026-10", "2026-11"],
    [1000, 1000, "2026-10", "2026-11"],
  ])("the change line for %d against %d in %s", async (today, prior, month, current) => {
    const mobile = await load<MobileHome>("copy/home.ts");
    const web = netWorthDelta(today, { month, netWorth: prior }, current);
    // The app reads the change from the same engine selector.
    const change = selectNetWorthChange(
      today,
      [{ month, netWorth: prior, allCarried: false }],
      current,
    );
    if (!change) throw new Error("expected a change");
    const line = mobile.changeLine(change, current);
    expect([line.direction, line.text]).toEqual([web?.direction, web?.text]);
  });

  it("what a screen reader hears for the trend bars", async () => {
    const mobile = await load<MobileHome>("copy/home.ts");
    expect(mobile.trendIntro(7)).toBe(trendIntro(7));
    for (const b of [bar({}), bar({ latest: true }), bar({ netWorth: -6400 })]) {
      expect(mobile.barLine(b)).toBe(barLine(b));
    }
    for (const missed of [
      { from: "2026-07", to: "2026-07", count: 1 },
      { from: "2026-06", to: "2026-08", count: 3 },
    ]) {
      expect(mobile.missedLine(missed)).toBe(missedLine(missed));
    }
  });

  it("the website pages the app links to are web's", async () => {
    const shell = await load<MobileShell>("navigation/shell.ts");
    expect(shell.NET_WORTH_SETTINGS_WEB_ROUTE).toBe(NET_WORTH_SETTINGS_HREF);
    expect(shell.ADD_HOME_VALUE_WEB_ROUTE).toBe(ADD_HOME_VALUE_HREF);
    expect(shell.ADD_ACCOUNT_WEB_ROUTE).toBe("/app/accounts");
  });

  it.each([
    ["arrow-up", ArrowUp],
    ["arrow-down", ArrowDown],
    ["minus", Minus],
  ] as const)(
    "the change arrow %s draws lucide's shape, as web's HeroFigure",
    async (name, icon) => {
      const { ICON_SHAPES } = await load<{ ICON_SHAPES: Record<string, readonly IconShape[]> }>(
        "navigation/iconShapes.ts",
      );
      const inner = renderToStaticMarkup(createElement(icon))
        .replace(/^<svg[^>]*>/, "")
        .replace(/<\/svg>$/, "");
      const mobile = (ICON_SHAPES[name] ?? [])
        .map(
          ([tag, attrs]) =>
            `<${tag} ${Object.entries(attrs)
              .map(([k, v]) => `${k}="${v}"`)
              .join(" ")}></${tag}>`,
        )
        .join("");
      expect(mobile).toBe(inner);
    },
  );
});
