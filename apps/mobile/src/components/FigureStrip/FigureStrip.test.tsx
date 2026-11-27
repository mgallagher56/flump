import { dark, light, textStyles } from "@flump/tokens/native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { Dimensions, StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { FigureStrip, type FigureStripProps } from "./FigureStrip";
import { figureStripStates } from "./FigureStrip.states";

/** The window the strip lays itself out in (useWindowDimensions reads Dimensions, as TabBar's test). */
const windowSize = (width: number, fontScale: number) =>
  jest.spyOn(Dimensions, "get").mockReturnValue({ width, height: 844, scale: 3, fontScale });

const textOf = (words: string) =>
  StyleSheet.flatten(screen.getByText(words).props.style) as TextStyle;

async function strip(
  props: Partial<FigureStripProps>,
  { scheme = "light", textScale }: { scheme?: "light" | "dark"; textScale?: number } = {},
) {
  const onAddBudget = jest.fn();
  const onAddSpending = jest.fn();
  await render(
    <ThemeProvider scheme={scheme} textScale={textScale}>
      <FigureStrip {...props} onAddBudget={onAddBudget} onAddSpending={onAddSpending} />
    </ThemeProvider>,
  );
  return { onAddBudget, onAddSpending };
}

describe("FigureStrip", () => {
  beforeEach(() => {
    // A 390 point phone at the normal text size: the cells sit side by side.
    windowSize(390, 1);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("two figures: left over from the budget and what is owed, each read out as one item", async () => {
    await strip(figureStripStates.twoFigures);
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
    expect(screen.queryByTestId("figure-strip-prompt")).toBeNull();
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)(
    "short: the label says so, the figure keeps the ordinary colour, no icon (%s)",
    async (scheme, tokens) => {
      await strip(figureStripStates.short, { scheme });
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
    const { onAddSpending, onAddBudget } = await strip(figureStripStates.incomeOnly);
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
    const { onAddBudget } = await strip(figureStripStates.prompt);
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
    await strip(figureStripStates.refused);
    const notice =
      "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.";
    expect(screen.getByText(notice)).toBeOnTheScreen();
    expect(screen.getByLabelText(`Left over each month, ${notice}`).props.accessible).toBe(true);
    expect(screen.queryByTestId("figure-strip-first-figure")).toBeNull();
    expect(screen.queryByText("£0")).toBeNull();
    expect(screen.queryByText("Not set")).toBeNull();
    expect(screen.queryByTestId("figure-strip-prompt")).toBeNull();
    expect(screen.getByText("What you owe")).toBeOnTheScreen();
  });

  it("pension with no debt: the pension pots in the second card", async () => {
    await strip(figureStripStates.pension);
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
    expect(screen.queryByTestId("figure-strip-second")).toBeNull();
    expect(screen.queryByText("Pension pots")).toBeNull();
    // No second card reading "Not set": the strip holds the one known figure (web's P3.2).
    expect(screen.queryByText("Not set")).toBeNull();
    expect(screen.getByTestId("figure-strip").children).toHaveLength(1);
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
    expect(screen.getByTestId("figure-strip-prompt")).toBeOnTheScreen();
    expect(screen.queryByText("£125")).toBeNull();
  });

  it("what the budget leaves out replaces the caption", async () => {
    await strip(figureStripStates.leavesOut);
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
      ...figureStripStates.prompt,
      websiteLabel: "Open the Flump website",
    });
    await userEvent.setup().press(screen.getByRole("link", { name: "Open the Flump website" }));
    expect(onAddBudget).toHaveBeenCalledTimes(1);
  });

  it("loading: two cells of still blocks, hidden from screen readers; nothing with no strip", async () => {
    await strip({ loading: true });
    expect(
      screen.getByTestId("figure-strip-loading-first", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      screen.getByTestId("figure-strip-loading-second", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.queryByTestId("figure-strip-loading")).toBeNull();
    await strip({});
    expect(screen.queryByTestId("figure-strip", { includeHiddenElements: true })).toBeNull();
  });

  describe("layout", () => {
    const direction = () =>
      (StyleSheet.flatten(screen.getByTestId("figure-strip").props.style) as ViewStyle)
        .flexDirection;

    it("side by side on a 390 point phone at the normal text size", async () => {
      await strip(figureStripStates.twoFigures);
      expect(direction()).toBe("row");
    });

    it("stacked at 150% text and more (the phone's own size)", async () => {
      windowSize(390, 1.5);
      await strip(figureStripStates.twoFigures);
      expect(direction()).toBe("column");
    });

    it("side by side just under 150% text", async () => {
      windowSize(390, 1.49);
      await strip(figureStripStates.twoFigures);
      expect(direction()).toBe("row");
    });

    it("stacked at 320 points wide, side by side at 360", async () => {
      windowSize(359, 1);
      await strip(figureStripStates.twoFigures);
      expect(direction()).toBe("column");
      windowSize(360, 1);
      await strip(figureStripStates.twoFigures);
      expect(direction()).toBe("row");
    });

    it("a gallery preview at 200% stacks", async () => {
      await strip(figureStripStates.twoFigures, { textScale: 2 });
      expect(direction()).toBe("column");
    });
  });

  // The loading blocks hold no text; their heights follow the text size (skeletonHeights).
  it.each(Object.entries(figureStripStates).filter(([name]) => name !== "loading"))(
    "%s holds at 200%% text",
    async (_name, props) => {
      await expectHoldsAtDoubleText(<FigureStrip {...props} />);
    },
  );
});
