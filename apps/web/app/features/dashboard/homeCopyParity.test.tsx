// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  type NetWorthLeftOut,
  type NetWorthTrendBar,
  selectNetWorthChange,
} from "@flump/finance-engine";
import { TaxRatesStatusBanner, type TaxRatesStatusBannerProps } from "@repo/ui";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ADD_AN_ESTIMATE,
  CHANGE_WHAT_COUNTS,
  HOME_VALUE_MISSING_TEXT,
  leftOutSentence,
} from "~/features/accounts/components/NetWorthBasisLine/NetWorthBasisLine";
import {
  ADD_SPENDING_PROMPT,
  INCOME_ONLY_LABEL,
  LEFT_OVER_CAPTION,
  OWED_CAPTION,
  PENSION_CAPTION,
} from "./components/DashboardKpiStrip/DashboardKpiStrip";
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
interface MobileStrip {
  STRIP: Record<string, string>;
  ratesNoticeSentence(rates: TaxRatesStatusBannerProps): string;
}
interface MobileShell {
  BUDGET_WEB_ROUTE: string;
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
    // "Change what counts" opens the app's own setting (S9), so it says web's words as they are.
    expect(HOME.changeWhatCounts).toBe(CHANGE_WHAT_COUNTS);
    // The estimate link opens the app's add form (E12 S8), in web's own words.
    expect(HOME.addEstimate).toBe(ADD_AN_ESTIMATE);
    // The hero's empty prompt and action are written inline in HomeDashboard.
    const dashboard = readFileSync(
      new URL("./components/HomeDashboard/HomeDashboard.tsx", import.meta.url),
      "utf8",
    );
    expect(dashboard).toContain(`emptyPrompt="${HOME.emptyPrompt}"`);
    expect(dashboard).toContain(`>${HOME.addAccount}</SampleAwareLink>`);
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

describe("the mobile Home strip says what web's dashboard strip says (E12 S5b)", () => {
  const strip = readFileSync(
    new URL("./components/DashboardKpiStrip/DashboardKpiStrip.tsx", import.meta.url),
    "utf8",
  );

  it("the labels and captions", async () => {
    const { STRIP } = await load<MobileStrip>("copy/home.ts");
    expect(STRIP.leftOverCaption).toBe(LEFT_OVER_CAPTION);
    expect(STRIP.owedCaption).toBe(OWED_CAPTION);
    expect(STRIP.pensionCaption).toBe(PENSION_CAPTION);
    expect(STRIP.incomeOnly).toBe(INCOME_ONLY_LABEL);
    // The card labels are written inline in DashboardKpiStrip.
    expect(strip).toContain(`label={short ? "${STRIP.short}" : "${STRIP.leftOver}"}`);
    expect(strip).toContain(`label="${STRIP.owed}"`);
    expect(strip).toContain(`label="${STRIP.pension}"`);
  });

  it("the prompt and the links, which open the website until S10 and say so", async () => {
    const { STRIP } = await load<MobileStrip>("copy/home.ts");
    expect(strip).toContain(`title: "${STRIP.prompt}"`);
    expect(strip).toContain('addLink("/app/budget", "Add your budget")');
    expect(STRIP.addBudget).toBe("Add your budget on the website");
    expect(STRIP.addSpending).toBe(
      ADD_SPENDING_PROMPT.replace("Add your spending", "Add your spending on the website"),
    );
    const shell = await load<MobileShell>("navigation/shell.ts");
    expect(strip).toContain(`to="${shell.BUDGET_WEB_ROUTE}"`);
  });

  it.each([
    { calendarYear: "2027/28", ratesYear: "2027/28", isFallback: false, kind: "provisional" },
    { calendarYear: "2028/29", ratesYear: "2027/28", isFallback: true },
    { calendarYear: "2027/28", ratesYear: "2026/27", isFallback: false },
    { calendarYear: "2026/27", ratesYear: "2026/27", isFallback: false },
  ] satisfies TaxRatesStatusBannerProps[])(
    "the rates notice for %j is TaxRatesStatusBanner's sentence",
    async (rates) => {
      const mobile = await load<MobileStrip>("copy/home.ts");
      const banner = renderToStaticMarkup(createElement(TaxRatesStatusBanner, rates));
      const web = /<span>([^<]*)<\/span>/.exec(banner)?.[1] ?? "";
      expect(mobile.ratesNoticeSentence(rates)).toBe(web);
    },
  );
});
