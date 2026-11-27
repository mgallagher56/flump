// @vitest-environment node

import { fileURLToPath } from "node:url";
import {
  type NetWorthLeftOut,
  type RecordedMonthComparison,
  selectRecordedMonthComparison,
  selectSeriesChange,
} from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import {
  sourceLabel as accountSourceNote,
  BALANCE_HISTORY_COPY,
  HISTORY_DESCRIPTION,
} from "~/components/accounts/AccountDetails/AccountDetails";
import {
  ACCOUNT_CHART_NOT_ENOUGH,
  type AccountChartRow,
  accountChartSummary,
  accountSourceLabel,
} from "~/components/charts/AccountDetailChart/AccountDetailChart";
import {
  ACCOUNT_DETAIL_COPY,
  balanceDateLine,
  NOT_COUNTED_TEXT,
} from "~/containers/accounts/accountDetailContainer/AccountDetailContainer";
import { ACCOUNTS_EMPTY } from "~/containers/accounts/accountsContainer/AccountsContainer";
import { ACCOUNT_SUBTYPE_LABEL } from "~/features/accounts/accountSubtypes";
import {
  ACCOUNTS_LIST_COPY,
  HISTORY_HREF,
  STUDENT_LOAN_FACTS,
  studentLoanFootnote,
  TYPE_LABEL,
  typeLine,
} from "~/features/accounts/components/AccountsGroupList/AccountsGroupList";
import { changeByAccountCaption } from "~/features/snapshot/components/MonthlyChangeTable/MonthlyChangeTable";
import { sourceLabel as historySourceNote } from "~/features/snapshot/components/NetWorthHistoryChart/NetWorthHistoryChart";
import {
  basisSentence,
  chartSummary,
  comparedMonthsText,
  fewMonthsPrompt,
  HISTORY_COPY,
  notRecordedPrompt,
  recordedForSentence,
  sentences,
} from "~/features/snapshot/components/SnapshotHistoryPage/SnapshotHistoryPage";
import { formatSignedChange, spokenChange } from "~/features/snapshot/snapshotCopy";
import {
  changeSinceSentence,
  formatMonth,
  historySourceLabel,
  nextCheckInDate,
} from "~/features/snapshot/snapshotModel";

/**
 * The mobile app's accounts list, account page and net worth history say what web's say (E12 S6,
 * plan 9.9). The app keeps its words in `apps/mobile/src/copy/accounts.ts`; this test, run by
 * web's suite so a web-only change fails at once, pins them to web's own constants and functions.
 * The mobile files sit outside this project, so they are loaded by path (as `homeCopyParity`).
 */
const MOBILE_SRC = new URL("../../../../mobile/src/", import.meta.url);

type Fn<A extends unknown[], R> = (...args: A) => R;
interface MobileAccounts {
  ACCOUNTS: Record<string, string>;
  ACCOUNT: Record<string, string>;
  HISTORY: Record<string, string>;
  STUDENT_LOAN_FACTS: string;
  studentLoanFootnote: Fn<[boolean], string>;
  TYPE_LABEL: Record<string, string>;
  ACCOUNT_SUBTYPE_LABEL: Record<string, string>;
  typeLine: Fn<
    [
      {
        name: string;
        type: string;
        accountSubtype?: string | null;
        ownership?: string;
        sharePercent?: number;
      },
    ],
    string | null
  >;
  balanceDateLine: Fn<
    [
      { month: number; year: number },
      { month: number; year: number; source?: string | null } | null,
    ],
    string | null
  >;
  heroSentences: Fn<(string | null)[], string | null>;
  accountMonthNote: Fn<[{ source?: string | null; carried?: true }], string | null>;
  accountChartSummary: Fn<[string | null, number | null, boolean], string>;
  changeSinceSentence: Fn<[string | null, number | null], string>;
  fewMonthsPrompt: Fn<[number], string>;
  comparedMonthsText: Fn<[RecordedMonthComparison], string>;
  notRecordedPrompt: Fn<[string], string>;
  basisSentence: Fn<[readonly NetWorthLeftOut[]], string>;
  sentences: Fn<string[], string>;
  historyChartSummary: Fn<[string | null, number | null, boolean, boolean], string>;
  recordedForSentence: Fn<[string, number], string>;
  formatMonth: Fn<[string], string>;
  nextCheckInLine: Fn<[string], string>;
  changeByAccountCaption: Fn<[string, string], string>;
  formatSignedChange: Fn<[number], string>;
  spokenChange: Fn<[number], string>;
  historySourceLabel: Fn<[string | null | undefined], string | undefined>;
  pounds: Fn<[number], string>;
}
interface MobileShell {
  NET_WORTH_HISTORY_WEB_ROUTE: string;
  accountWebRoute(id: string): string;
}

const load = async <T,>(path: string) =>
  (await import(/* @vite-ignore */ fileURLToPath(new URL(path, MOBILE_SRC)))) as T;
const mobile = () => load<MobileAccounts>("copy/accounts.ts");

/** Web's chart summaries format whole pounds, as `useFormatCurrency` with no pence. */
const whole = (v: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(v);

describe("the mobile accounts list says what web's says", () => {
  it("the hero, groups, totals and empty state", async () => {
    const { ACCOUNTS } = await mobile();
    for (const [key, words] of Object.entries(ACCOUNTS_LIST_COPY)) {
      expect([key, ACCOUNTS[key]]).toEqual([key, words]);
    }
    expect(ACCOUNTS.emptyTitle).toBe(ACCOUNTS_EMPTY.title);
    expect(ACCOUNTS.emptyDescription).toBe(ACCOUNTS_EMPTY.description);
    expect(ACCOUNTS.startCheckIn).toBe(HISTORY_COPY.startCheckIn);
    expect(ACCOUNTS.addAccount).toBe("Add an account on the website");
  });

  it("the student loan words and the type labels", async () => {
    const m = await mobile();
    expect(m.STUDENT_LOAN_FACTS).toBe(STUDENT_LOAN_FACTS);
    expect(m.studentLoanFootnote(true)).toBe(studentLoanFootnote(true));
    expect(m.studentLoanFootnote(false)).toBe(studentLoanFootnote(false));
    expect(m.TYPE_LABEL).toEqual(TYPE_LABEL);
    expect(m.ACCOUNT_SUBTYPE_LABEL).toEqual(ACCOUNT_SUBTYPE_LABEL);
  });

  it.each([
    { name: "Current account", type: "Current" },
    { name: "Easy access savings", type: "Saving" },
    { name: "Mortgage", type: "Mortgage", ownership: "joint" as const, sharePercent: 50 },
    { name: "Our home", type: "Property", ownership: "joint" as const, sharePercent: 40 },
    { name: "Mortgage", type: "Mortgage", ownership: "joint" as const, sharePercent: 0 },
    { name: "ISA", type: "Investment", accountSubtype: "stocks_and_shares_isa" },
    { name: "Bonds", type: "Bonds from a later backend" },
  ])("the type line for $name ($type)", async (row) => {
    const m = await mobile();
    const web = typeLine({ id: "x", balance: 1, changePercent: null, favourable: true, ...row });
    expect(m.typeLine(row)).toBe(web);
  });

  it("the history route and an account's route are web's", async () => {
    const shell = await load<MobileShell>("navigation/shell.ts");
    expect(shell.NET_WORTH_HISTORY_WEB_ROUTE).toBe(HISTORY_HREF);
    expect(shell.accountWebRoute("abc-123")).toBe("/app/accounts/abc-123");
  });
});

describe("the mobile account page says what web's says", () => {
  it("the labels, not counted, not found and the history section", async () => {
    const { ACCOUNT } = await mobile();
    for (const [key, words] of Object.entries(ACCOUNT_DETAIL_COPY)) {
      expect([key, ACCOUNT[key]]).toEqual([key, words]);
    }
    expect(ACCOUNT.notCounted).toBe(NOT_COUNTED_TEXT);
    expect(ACCOUNT.historyTitle).toBe(BALANCE_HISTORY_COPY.title);
    expect(ACCOUNT.noHistoryTitle).toBe(BALANCE_HISTORY_COPY.emptyTitle);
    expect(ACCOUNT.noHistoryDescription).toBe(BALANCE_HISTORY_COPY.emptyDescription);
    expect(ACCOUNT.historyDescription).toBe(HISTORY_DESCRIPTION);
    expect(ACCOUNT.chartNotEnough).toBe(ACCOUNT_CHART_NOT_ENOUGH);
  });

  it.each([
    [null],
    [{ month: 11, year: 2026, source: "manual" }],
    [{ month: 10, year: 2026, source: "manual" }],
    [{ month: 10, year: 2026, source: "calculated" }],
    [{ month: 12, year: 2025, source: null }],
  ])("the date line for %j in November 2026", async (latest) => {
    const m = await mobile();
    const current = { month: 11, year: 2026 };
    expect(m.balanceDateLine(current, latest)).toBe(balanceDateLine({ current, latest }));
  });

  it("each month's note is web's source word, except a typed one, which has none", async () => {
    const m = await mobile();
    const row = (over: Partial<AccountChartRow>): AccountChartRow => ({
      month: 10,
      year: 2026,
      value: 1,
      ...over,
    });
    expect(m.accountMonthNote({ carried: true })).toBe(accountSourceLabel(row({ carried: true })));
    for (const source of ["calculated", "confirmed"]) {
      expect(m.accountMonthNote({ source })).toBe(accountSourceLabel(row({ source })));
      expect(m.accountMonthNote({ source })).toBe(accountSourceNote(source));
    }
    expect(m.accountMonthNote({ source: "manual" })).toBe(accountSourceNote("manual"));
  });

  it.each([
    [[189300, 188750, 186000], true],
    [[1000, 1300], false],
    [[1000, 1000.4], false],
  ])("the chart summary for %j, carried end %s", async (values, carried) => {
    const m = await mobile();
    const rows: AccountChartRow[] = values.map((value, i) => ({
      month: 5 + i,
      year: 2026,
      value,
      ...(carried && i === values.length - 1 ? { carried: true } : {}),
    }));
    // The app reads the change from the same engine selector.
    const change = selectSeriesChange(rows);
    expect(m.accountChartSummary("2026-05", change, carried)).toBe(
      accountChartSummary(rows, whole),
    );
  });
});

describe("the mobile net worth history says what web's says", () => {
  it("the fixed words", async () => {
    const { HISTORY } = await mobile();
    for (const key of [
      "title",
      "description",
      "heroLabel",
      "noChangeLabel",
      "noChangePrompt",
      "noEarlierMonth",
      "chartTitle",
      "chartDescription",
      "emptyTitle",
      "emptyWithAccounts",
      "emptyNoAccounts",
      "showChanges",
    ] as const) {
      expect([key, HISTORY[key]]).toEqual([key, HISTORY_COPY[key]]);
    }
    expect(HISTORY.addEarlierMonths).toBe(`${HISTORY_COPY.addEarlierMonths} on the website`);
    expect(HISTORY.recorded).toBe(historySourceNote({ recorded: 1 }));
    expect(HISTORY.carriedForward).toBe(historySourceNote({ recorded: null }));
  });

  it("the prompts, the months compared and the leave-out sentence", async () => {
    const m = await mobile();
    for (const n of [0, 1, 2]) expect(m.fewMonthsPrompt(n)).toBe(fewMonthsPrompt(n));
    expect(m.notRecordedPrompt("November")).toBe(notRecordedPrompt("November"));
    for (const series of [
      [
        { month: "2026-09", netWorth: 10770, allCarried: false },
        { month: "2026-10", netWorth: 11235, allCarried: false },
      ],
      [
        { month: "2025-12", netWorth: 100, allCarried: false },
        { month: "2026-01", netWorth: 50, allCarried: false },
      ],
    ]) {
      const { comparison } = selectRecordedMonthComparison(series, "2026-11");
      if (!comparison) throw new Error("expected a comparison");
      expect(m.comparedMonthsText(comparison)).toBe(comparedMonthsText(comparison));
    }
    for (const leftOut of [[], ["studentLoan"], ["homeValueMissing"]] as NetWorthLeftOut[][]) {
      expect(m.basisSentence(leftOut)).toBe(basisSentence(leftOut));
    }
    expect(m.sentences("Up £100 since July 2026", "", "Next.")).toBe(
      sentences("Up £100 since July 2026", "", "Next."),
    );
  });

  it.each([
    // The home owner's series: May recorded to October, November carried.
    [[215950, 218525, 221100, 223675, 226250, 228825, 231400], [6]],
    // A gap in August, and this month recorded.
    [[1000, 1100, 1100, 1300, 1250, 1250, 1500], [2]],
    [[500, 500, 500], []],
  ])("the chart summary for %j with carried months %j", async (values, carriedAt) => {
    const m = await mobile();
    const series = values.map((netWorth, i) => ({
      month: `2026-${String(5 + i).padStart(2, "0")}`,
      netWorth,
      allCarried: carriedAt.includes(i),
    }));
    const current = series.at(-1)?.month ?? "2026-11";
    const endCarried = series.at(-1)?.allCarried === true;
    const earlierCarried = series.slice(0, endCarried ? -1 : undefined).some((p) => p.allCarried);
    const change = selectSeriesChange(series.map((p) => ({ value: p.netWorth })));
    expect(m.historyChartSummary("2026-05", change, earlierCarried, endCarried)).toBe(
      chartSummary(series, current, whole),
    );
  });

  it("the summary below three months, the next check-in and the change words", async () => {
    const m = await mobile();
    expect(m.recordedForSentence("2026-10", 800)).toBe(
      recordedForSentence(formatMonth("2026-10"), m.pounds(800)),
    );
    expect(m.formatMonth("2026-10")).toBe(formatMonth("2026-10"));
    // The engine's date for no check-in day after November is done: 1 December.
    expect(m.nextCheckInLine("2026-12-01")).toBe(
      `Next check-in: ${nextCheckInDate({ today: "2026-11-20", checkInDay: null, lastRecordedMonth: "2026-11" })}`,
    );
    expect(m.changeByAccountCaption("2026-09", "2026-10")).toBe(
      changeByAccountCaption("2026-09", "2026-10"),
    );
    for (const change of [1200, -300, 0, 0.4, -0.4, 35]) {
      expect([change, m.formatSignedChange(change)]).toEqual([change, formatSignedChange(change)]);
      expect([change, m.spokenChange(change)]).toEqual([change, spokenChange(change)]);
    }
    for (const source of ["calculated", "confirmed", null, "manual"] as const) {
      expect(m.historySourceLabel(source)).toBe(historySourceLabel(source as never));
    }
    for (const [first, change] of [
      ["2026-05", 15450],
      ["2026-05", -1200],
      ["2026-05", 0],
    ] as const) {
      const points = [
        { month: first, value: 0 },
        { month: "2026-11", value: change },
      ];
      expect(m.changeSinceSentence(first, selectSeriesChange(points))).toBe(
        changeSinceSentence(points, whole),
      );
    }
  });
});
