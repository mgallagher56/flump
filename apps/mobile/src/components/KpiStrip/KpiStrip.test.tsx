import { dark, light, textStyles } from "@flump/tokens/native";
import { render, screen, userEvent, within } from "@testing-library/react-native";
import {
  AccessibilityInfo,
  Dimensions,
  StyleSheet,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { KpiStrip, type KpiStripProps } from "./KpiStrip";
import { kpiStripStates } from "./KpiStrip.states";

/** The window the strip lays itself out in (useWindowDimensions reads Dimensions, as TabBar's test). */
const windowSize = (width: number, fontScale: number) =>
  jest.spyOn(Dimensions, "get").mockReturnValue({ width, height: 844, scale: 3, fontScale });

const textOf = (words: string) =>
  StyleSheet.flatten(screen.getByText(words).props.style) as TextStyle;

async function strip(
  props: Partial<KpiStripProps>,
  { scheme = "light", textScale }: { scheme?: "light" | "dark"; textScale?: number } = {},
) {
  const onAddBudget = jest.fn();
  const onAddSpending = jest.fn();
  await render(
    <ThemeProvider scheme={scheme} textScale={textScale}>
      <KpiStrip {...props} onAddBudget={onAddBudget} onAddSpending={onAddSpending} />
    </ThemeProvider>,
  );
  return { onAddBudget, onAddSpending };
}

describe("KpiStrip", () => {
  beforeEach(() => {
    // A 390 point phone at the normal text size: the cells sit side by side.
    windowSize(390, 1);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("two figures: left over from the budget and what is owed, each read out as one item", async () => {
    await strip(kpiStripStates.twoFigures);
    expect(screen.getByText("Left over each month")).toBeOnTheScreen();
    expect(screen.getByText("£125")).toBeOnTheScreen();
    expect(screen.getByText("From your budget")).toBeOnTheScreen();
    expect(screen.getByText("What you owe")).toBeOnTheScreen();
    expect(screen.getByText("£1,800")).toBeOnTheScreen();
    expect(screen.getByText("Cards, loans and overdrafts")).toBeOnTheScreen();
    expect(
      screen.getByLabelText("Left over each month, £125, From your budget").props.accessible,
    ).toBe(true);
    expect(
      screen.getByLabelText("What you owe, £1,800, Cards, loans and overdrafts").props.accessible,
    ).toBe(true);
    // Whole pounds in the strip's figure size, with tabular numerals.
    expect(textOf("£125").fontSize).toBe(textStyles["heading.md"].fontSize);
    expect(textOf("£125").fontVariant).toEqual(["tabular-nums"]);
    expect(screen.queryByTestId("kpi-strip-prompt")).toBeNull();
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)(
    "short: the label says so, the figure keeps the ordinary colour, no icon (%s)",
    async (scheme, tokens) => {
      await strip(kpiStripStates.short, { scheme });
      expect(screen.getByText("Short each month")).toBeOnTheScreen();
      expect(screen.queryByText("Left over each month")).toBeNull();
      expect(screen.getByText("-£240")).toBeOnTheScreen();
      expect(textOf("-£240").color).toBe(tokens.colors["text.primary"]);
      expect(textOf("Short each month").color).toBe(tokens.colors["text.secondary"]);
      expect(screen.getByLabelText("Short each month, minus £240, From your budget")).toBeTruthy();
      expect(screen.queryByTestId("icon")).toBeNull();
    },
  );

  it("income only: the budget's income, and a link to add spending on the website", async () => {
    const { onAddSpending, onAddBudget } = await strip(kpiStripStates.incomeOnly);
    expect(screen.getByText("Income in your budget")).toBeOnTheScreen();
    expect(screen.getByText("£2,085")).toBeOnTheScreen();
    expect(screen.queryByText("Left over each month")).toBeNull();
    expect(screen.getByLabelText("Income in your budget, £2,085").props.accessible).toBe(true);
    await userEvent.setup().press(
      screen.getByRole("link", {
        name: "Add your spending on the website to see what is left over each month",
      }),
    );
    expect(onAddSpending).toHaveBeenCalledTimes(1);
    expect(onAddBudget).not.toHaveBeenCalled();
    // No debt: the pension pots take the second card.
    expect(screen.getByText("Pension pots")).toBeOnTheScreen();
    expect(screen.getByText("£9,000")).toBeOnTheScreen();
    expect(screen.getByText("From your accounts")).toBeOnTheScreen();
  });

  it("no budget: one prompt in place of the whole strip, hiding what is owed", async () => {
    const { onAddBudget } = await strip(kpiStripStates.prompt);
    expect(
      screen.getByText("Add your budget to see what is left over each month"),
    ).toBeOnTheScreen();
    expect(screen.queryByText("What you owe")).toBeNull();
    expect(screen.queryByText("£1,800")).toBeNull();
    expect(screen.queryByText("£0")).toBeNull();
    await userEvent
      .setup()
      .press(screen.getByRole("link", { name: "Add your budget on the website" }));
    expect(onAddBudget).toHaveBeenCalledTimes(1);
  });

  it("refused: the notice in place of the figure, never £0 and never the budget prompt", async () => {
    await strip(kpiStripStates.refused);
    const notice =
      "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.";
    expect(screen.getByText(notice)).toBeOnTheScreen();
    expect(screen.getByLabelText(`Left over each month, ${notice}`).props.accessible).toBe(true);
    expect(screen.queryByTestId("kpi-strip-first-figure")).toBeNull();
    expect(screen.queryByText("£0")).toBeNull();
    expect(screen.queryByText("Not set")).toBeNull();
    expect(screen.queryByTestId("kpi-strip-prompt")).toBeNull();
    expect(screen.getByText("What you owe")).toBeOnTheScreen();
  });

  it.each([
    ["twoFigures", ["kpi-strip-left-over", "kpi-strip-owed"]],
    ["short", ["kpi-strip-short", "kpi-strip-owed"]],
    ["incomeOnly", ["kpi-strip-income-only", "kpi-strip-pension"]],
    ["refused", ["kpi-strip-refused", "kpi-strip-owed"]],
    ["pension", ["kpi-strip-left-over", "kpi-strip-pension"]],
  ] as const)("%s: each card's group carries its kind as a test id", async (state, ids) => {
    await strip(kpiStripStates[state]);
    for (const id of ids) expect(screen.getByTestId(id).props.accessible).toBe(true);
    const others = ["owed", "pension"]
      .map((k) => `kpi-strip-${k}`)
      .filter((id) => !ids.includes(id as never));
    for (const id of others) expect(screen.queryByTestId(id)).toBeNull();
  });

  it("pension with no debt: the pension pots in the second card", async () => {
    await strip(kpiStripStates.pension);
    expect(screen.getByLabelText("Pension pots, £9,000, From your accounts").props.accessible).toBe(
      true,
    );
    expect(screen.queryByText("What you owe")).toBeNull();
  });

  it("neither debt nor pension: the one figure on its own", async () => {
    await strip({
      strip: {
        first: { kind: "leftOver", figure: 125, leavesOut: null },
        second: { kind: "none" },
        collapsed: false,
        ratesNotice: null,
      },
    });
    expect(screen.getByText("£125")).toBeOnTheScreen();
    expect(screen.queryByTestId("kpi-strip-second")).toBeNull();
    expect(screen.queryByText("Pension pots")).toBeNull();
    // No second card reading "Not set": the strip holds the one known figure (web's P3.2).
    expect(screen.queryByText("Not set")).toBeNull();
    expect(screen.getByTestId("kpi-strip").children).toHaveLength(1);
  });

  it("follows the engine's collapsed flag: one prompt whenever it says so", async () => {
    await strip({
      strip: {
        first: { kind: "leftOver", figure: 125, leavesOut: null },
        second: { kind: "owed", figure: 1800 },
        collapsed: true,
        ratesNotice: null,
      },
    });
    expect(screen.getByTestId("kpi-strip-prompt")).toBeOnTheScreen();
    expect(screen.queryByText("£125")).toBeNull();
  });

  it("what the budget leaves out replaces the caption", async () => {
    await strip(kpiStripStates.leavesOut);
    const leavesOut =
      "The 2027/28 repayment threshold for this student loan plan is not published yet, so repayments are not included.";
    expect(screen.getByText(leavesOut)).toBeOnTheScreen();
    expect(screen.queryByText("From your budget")).toBeNull();
    expect(screen.getByLabelText(`Left over each month, £147, ${leavesOut}`)).toBeTruthy();
  });

  it("income only with a leave-out notice says it under the figure", async () => {
    await strip({
      strip: {
        first: { kind: "incomeOnly", figure: 2085, leavesOut: "Not counting Plan 1." },
        second: { kind: "none" },
        collapsed: false,
        ratesNotice: null,
      },
    });
    expect(
      screen.getByLabelText("Income in your budget, £2,085, Not counting Plan 1."),
    ).toBeTruthy();
  });

  it("with no web app address, the links say they open the Flump website", async () => {
    const { onAddBudget } = await strip({
      ...kpiStripStates.prompt,
      websiteLabel: "Open the Flump website",
    });
    await userEvent.setup().press(screen.getByRole("link", { name: "Open the Flump website" }));
    expect(onAddBudget).toHaveBeenCalledTimes(1);
  });

  it("loading: two cells of still blocks, hidden from screen readers; nothing with no strip", async () => {
    await strip({ loading: true });
    expect(
      screen.getByTestId("kpi-strip-loading-first", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      screen.getByTestId("kpi-strip-loading-second", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.queryByTestId("kpi-strip-loading")).toBeNull();
    await strip({});
    expect(screen.queryByTestId("kpi-strip", { includeHiddenElements: true })).toBeNull();
  });

  it("figures drawn as given (the Budget tab): each card one item, unknown as Not set", async () => {
    await strip(kpiStripStates.budgetIncomeUnknown);
    expect(screen.getByLabelText("Money in each month, Not set, After tax").props.accessible).toBe(
      true,
    );
    expect(
      screen.getByLabelText("Going out each month, £1,960, Bills, spending and savings"),
    ).toBeOnTheScreen();
    expect(screen.queryByText("£0")).toBeNull();
    // Home's strip words never appear here.
    expect(screen.queryByText("Left over each month")).toBeNull();
  });

  it("with no items, the one prompt stands in for both figures", async () => {
    await strip(kpiStripStates.budgetPrompt);
    expect(
      screen.getByText("Add your income and spending to see money in and going out"),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Money in each month")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  describe("layout", () => {
    const direction = () =>
      (StyleSheet.flatten(screen.getByTestId("kpi-strip").props.style) as ViewStyle).flexDirection;

    it("side by side on a 390 point phone at the normal text size", async () => {
      await strip(kpiStripStates.twoFigures);
      expect(direction()).toBe("row");
    });

    it("stacked at 150% text and more (the phone's own size)", async () => {
      windowSize(390, 1.5);
      await strip(kpiStripStates.twoFigures);
      expect(direction()).toBe("column");
    });

    it("side by side just under 150% text", async () => {
      windowSize(390, 1.49);
      await strip(kpiStripStates.twoFigures);
      expect(direction()).toBe("row");
    });

    it("side by side at 320 points wide with the default text (STYLE-GUIDE 12, KpiStrip)", async () => {
      windowSize(320, 1);
      await strip(kpiStripStates.twoFigures);
      expect(direction()).toBe("row");
    });

    it("a gallery preview at 200% stacks", async () => {
      await strip(kpiStripStates.twoFigures, { textScale: 2 });
      expect(direction()).toBe("column");
    });
  });

  // The loading blocks hold no text; their heights follow the text size (skeletonHeights).
  it.each(Object.entries(kpiStripStates).filter(([name]) => name !== "loading"))(
    "%s holds at 200%% text",
    async (_name, props) => {
      await expectHoldsAtDoubleText(<KpiStrip {...props} />);
    },
  );

  describe("info tip", () => {
    const EXPLAIN =
      "The income in your budget, minus your bills, living costs and what you put aside for savings each month.";

    it("twoFigures offers About Left over each month, toggles its text and announces on open", async () => {
      const announce = jest
        .spyOn(AccessibilityInfo, "announceForAccessibility")
        .mockImplementation(() => {});
      await strip(kpiStripStates.twoFigures);

      const trigger = screen.getByRole("button", { name: "About Left over each month" });
      expect(trigger.props.accessibilityState).toMatchObject({ expanded: false });
      expect(screen.queryByText(EXPLAIN)).toBeNull();

      await userEvent.setup().press(trigger);
      expect(
        screen.getByRole("button", { name: "About Left over each month" }).props.accessibilityState,
      ).toMatchObject({
        expanded: true,
      });
      expect(screen.getByText(EXPLAIN)).toBeOnTheScreen();
      expect(announce).toHaveBeenCalledTimes(1);
      expect(announce).toHaveBeenCalledWith(EXPLAIN);

      await userEvent
        .setup()
        .press(screen.getByRole("button", { name: "About Left over each month" }));
      expect(screen.queryByText(EXPLAIN)).toBeNull();
      expect(
        screen.getByRole("button", { name: "About Left over each month" }).props.accessibilityState,
      ).toMatchObject({ expanded: false });
      expect(announce).toHaveBeenCalledTimes(1);
    });

    it("short offers About Short each month with the same explanation", async () => {
      await strip(kpiStripStates.short);
      const trigger = screen.getByRole("button", { name: "About Short each month" });
      await userEvent.setup().press(trigger);
      expect(screen.getByText(EXPLAIN)).toBeOnTheScreen();
    });

    it.each([
      ["twoFigures", "Left over each month", "kpi-strip-left-over", kpiStripStates.twoFigures],
      ["short", "Short each month", "kpi-strip-short", kpiStripStates.short],
    ] as const)(
      "%s places the info tip trigger beside %s above the figure group",
      async (_name, label, groupTestID, props) => {
        await strip(props);
        const card = screen.getByTestId("kpi-strip-first");
        const childIds = card.children.map(
          (child) => (child as { props: { testID?: string } }).props.testID,
        );
        expect(childIds).toEqual(["kpi-strip-first-explain", groupTestID]);

        const row = screen.getByTestId("kpi-strip-first-explain-row");
        expect((StyleSheet.flatten(row.props.style) as ViewStyle).flexDirection).toBe("row");
        expect(within(row).getByText(label)).toBeOnTheScreen();
        expect(within(row).getByRole("button", { name: `About ${label}` })).toBeOnTheScreen();

        await userEvent.setup().press(within(row).getByRole("button", { name: `About ${label}` }));
        const explain = screen.getByTestId("kpi-strip-first-explain");
        expect(
          explain.children.map((child) => (child as { props: { testID?: string } }).props.testID),
        ).toEqual(["kpi-strip-first-explain-row", "kpi-strip-first-explain-body"]);
      },
    );

    it.each([
      ["incomeOnly", kpiStripStates.incomeOnly],
      ["refused", kpiStripStates.refused],
      ["budgetFigures", kpiStripStates.budgetFigures],
    ] as const)("%s shows no info tip trigger", async (_name, props) => {
      await strip(props);
      expect(screen.queryByRole("button", { name: /^About / })).toBeNull();
    });
  });
});
