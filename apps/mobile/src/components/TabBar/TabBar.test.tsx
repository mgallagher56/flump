import { dark, light } from "@flump/tokens/native";
import { fireEvent, render, screen, userEvent, within } from "@testing-library/react-native";
import { Profiler } from "react";
import { Dimensions, ScrollView, StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { TABS } from "../../navigation/navItems";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { TabBar } from "./TabBar";
import { tabBarStates } from "./TabBar.states";
import { LABEL_FIT_EPSILON, overflowCues, scrollTargetForTab, tabLayout } from "./TabBar.styles";

const flat = <T,>(style: unknown) => (StyleSheet.flatten(style as ViewStyle) ?? {}) as T;

async function renderBar(activeKey = "home", scheme: "light" | "dark" = "light", textScale = 1) {
  const onSelect = jest.fn();
  await render(
    <ThemeProvider scheme={scheme} textScale={textScale}>
      <TabBar items={TABS} activeKey={activeKey} onSelect={onSelect} />
    </ThemeProvider>,
  );
  return onSelect;
}

/** React Native's Jest window is 750 wide at a font scale of 2; a 320 point phone at 100% here. */
const phone = (fontScale = 1, width = 320) =>
  jest.spyOn(Dimensions, "get").mockReturnValue({ width, height: 640, scale: 2, fontScale });

async function measureLabels(widthsByKey: Readonly<Record<string, number>>) {
  for (const item of TABS) {
    const w = widthsByKey[item.key];
    if (w === undefined) continue;
    await fireEvent(
      screen.getByTestId(`tab-measure-${item.key}`, { includeHiddenElements: true }),
      "layout",
      { nativeEvent: { layout: { width: w, height: 24 } } },
    );
  }
}

const rows = () =>
  screen.getAllByTestId("tab-row").map((row) => ({
    style: flat<ViewStyle>(row.props.style),
    tabs: within(row)
      .queryAllByRole("tab")
      .map((tab) => tab.props.testID as string),
  }));

// The first render of both icon and scroll variants loads React Native's Svg and ScrollView
// modules, which on a cold Jest cache took several seconds inside the test body. Warming both
// once here keeps every test under its 5 s budget.
beforeAll(async () => {
  phone(1, 320);
  await renderBar("home", "light", 1);
  await renderBar("home", "light", 2);
  screen.unmount();
  jest.restoreAllMocks();
}, 30_000);

describe("TabBar", () => {
  beforeEach(() => {
    phone();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("is a named tablist of five tabs in web's order, the current one selected", async () => {
    await renderBar("budget");
    // A container, not one accessible element (that would merge the tabs into one on iOS).
    const list = screen.getByTestId("tab-bar");
    expect([list.props.accessibilityRole, list.props.accessibilityLabel]).toEqual([
      "tablist",
      "Main navigation",
    ]);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.props.testID)).toEqual([
      "tab-home",
      "tab-accounts",
      "tab-budget",
      "tab-taxAndPay",
      "tab-more",
    ]);
    expect(screen.getByRole("tab", { name: "Budget", selected: true })).toBeOnTheScreen();
    expect(screen.getAllByRole("tab", { selected: true })).toHaveLength(1);
    expect(screen.getByRole("tab", { name: "Pay" }).props.accessibilityHint).toBe("4 of 5");
  });

  it("every tab keeps the 48 point target", async () => {
    await renderBar();
    for (const tab of screen.getAllByRole("tab")) {
      expect(flat<ViewStyle>(tab.props.style)).toMatchObject({ minHeight: 48, minWidth: 48 });
    }
  });

  it("selecting another tab calls onSelect with its key; the current tab does nothing", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onSelect = await renderBar("home");
    await user.press(screen.getByRole("tab", { name: "Accounts" }));
    await user.press(screen.getByRole("tab", { name: "Home" }));
    expect(onSelect.mock.calls).toEqual([["accounts"]]);
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)(
    "%s: the current tab is a primary.subtle pill with primary text; the rest are secondary on the card",
    async (scheme, set) => {
      await renderBar("accounts", scheme);
      const current = screen.getByRole("tab", { name: "Accounts" });
      const other = screen.getByRole("tab", { name: "Home" });
      expect(flat<ViewStyle>(current.props.style).backgroundColor).toBe(
        set.colors["primary.subtle"],
      );
      expect(flat<ViewStyle>(other.props.style).backgroundColor).toBeUndefined();
      expect(flat<TextStyle>(screen.getByText("Accounts").props.style).color).toBe(
        set.colors.primary,
      );
      expect(flat<TextStyle>(screen.getByText("Home").props.style).color).toBe(
        set.colors["text.secondary"],
      );
      // Both pairs are in the shared contrast matrix (packages/tokens/src/contrast.ts).
    },
  );

  it("shows an icon on every tab at the normal size, and none at 200% text", async () => {
    const svgs = () => screen.queryAllByTestId(/^tab-.+-icon$/, { includeHiddenElements: true });
    await renderBar("home", "light", 1);
    expect(svgs()).toHaveLength(5);
    await renderBar("home", "light", 2);
    expect(svgs()).toHaveLength(0);
    expect(screen.getAllByRole("tab").map((tab) => tab.props.testID)).toHaveLength(5);
  });

  it("follows the phone's own text size: at 200% the icons go", async () => {
    phone(2);
    await renderBar("home", "light", 1);
    expect(screen.queryAllByTestId(/^tab-.+-icon$/, { includeHiddenElements: true })).toHaveLength(
      0,
    );
  });

  it.each([360, 393, 412])(
    "at %i points and the normal size, the five tabs share one row that cannot wrap",
    async (width) => {
      phone(1, width);
      await renderBar();
      const [only, ...more] = rows();
      expect(more).toEqual([]);
      expect(only?.tabs).toHaveLength(5);
      // Equal flex cells in a row that does not wrap: no percentage width for Android to round up.
      expect(only?.style.flexWrap).toBeUndefined();
      for (const cellView of screen.getAllByTestId(/^tab-cell-/)) {
        const cell = flat<ViewStyle>(cellView.props.style);
        expect(cell).toMatchObject({ flex: 1, flexBasis: 0 });
        expect(cell.width).toBeUndefined();
      }
    },
  );

  it("at 200% text on a narrow phone (320 points), scrolls horizontally with content-sized cells, an overflow cue and 48 point targets", async () => {
    // At 2x (fontSize 24): Home 60.8 + Accounts 113.6 + Budget 87.2 + Pay 47.6 + More 60.8 = 370 > 320.
    phone(2, 320);
    await renderBar();
    expect(rows().map((row) => row.tabs)).toEqual([
      ["tab-home", "tab-accounts", "tab-budget", "tab-taxAndPay", "tab-more"],
    ]);
    expect(screen.queryAllByTestId(/^tab-.+-icon$/, { includeHiddenElements: true })).toHaveLength(
      0,
    );
    const scroller = screen.getByTestId("tab-scroll");
    expect(scroller.props.horizontal).toBe(true);
    for (const cellView of screen.getAllByTestId(/^tab-cell-/)) {
      const cell = flat<ViewStyle>(cellView.props.style);
      expect(cell.flex).toBeUndefined();
      expect(cell.flexGrow).toBeUndefined();
      expect(cell.flexShrink).toBe(0);
    }
    for (const tab of screen.getAllByRole("tab")) {
      expect(flat<ViewStyle>(tab.props.style)).toMatchObject({ minHeight: 48, minWidth: 48 });
    }
    for (const item of TABS) {
      expect(screen.getByText(item.label).props.allowFontScaling).not.toBe(false);
    }
    // Right overflow fade shown once tab-bar has a measured height; no left fade at scroll x = 0.
    await fireEvent(screen.getByTestId("tab-bar"), "layout", {
      nativeEvent: { layout: { width: 312, height: 48 } },
    });
    const rightFade = screen.getByTestId("tab-fade-right", { includeHiddenElements: true });
    expect(rightFade.props.pointerEvents).toBe("none");
    expect(screen.queryByTestId("tab-fade-left", { includeHiddenElements: true })).toBeNull();
    await fireEvent(scroller, "contentSizeChange", 370, 48);
    await fireEvent(scroller, "scroll", { nativeEvent: { contentOffset: { x: 20 } } });
    expect(
      screen.getByTestId("tab-fade-left", { includeHiddenElements: true }).props.pointerEvents,
    ).toBe("none");
    expect(
      screen.getByTestId("tab-fade-right", { includeHiddenElements: true }).props.pointerEvents,
    ).toBe("none");

    await fireEvent(scroller, "scroll", { nativeEvent: { contentOffset: { x: 58 } } });
    expect(screen.getByTestId("tab-fade-left", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId("tab-fade-right", { includeHiddenElements: true })).toBeNull();
  });

  it("at 200% text on a wider phone (480 points), keeps one fixed row with proportional cells so no label wraps", async () => {
    // At 2x (fontSize 24, selected weight 0.58, horizontal pill padding 4 + 4 = 8, 10% margin, tablist width 472):
    // Home (4):     (4 * 24 * 0.58 + 8) * 1.1 =  70.048 -> share of 472 = 472 *  70.048 / 426.8 =  77.466 >=  70.048
    // Accounts (8): (8 * 24 * 0.58 + 8) * 1.1 = 131.296 -> share of 472 = 472 * 131.296 / 426.8 = 145.201 >= 131.296
    // Budget (6):   (6 * 24 * 0.58 + 8) * 1.1 = 100.672 -> share of 472 = 472 * 100.672 / 426.8 = 111.334 >= 100.672
    // Pay (3):      (3 * 24 * 0.58 + 8) * 1.1 =  54.736 -> share of 472 = 472 *  54.736 / 426.8 =  60.533 >=  54.736
    // More (4):     (4 * 24 * 0.58 + 8) * 1.1 =  70.048 -> share of 472 = 472 *  70.048 / 426.8 =  77.466 >=  70.048
    // Longest * 5 = 131.296 * 5 = 656.48 > 472 (equal cells would give 94.4pt < 131.296pt for Accounts);
    // Sum = 426.8 <= 472, so the row stays fixed with cells sized in proportion to each label.
    const expectedWidths = [70.048, 131.296, 100.672, 54.736, 70.048] as const;
    phone(2, 480);
    await renderBar();
    const [only, ...more] = rows();
    expect(more).toEqual([]);
    expect(only?.tabs).toHaveLength(5);
    expect(screen.queryByTestId("tab-scroll")).toBeNull();
    expect(screen.queryByTestId("tab-fade-left", { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId("tab-fade-right", { includeHiddenElements: true })).toBeNull();
    expect(screen.queryAllByTestId(/^tab-.+-icon$/, { includeHiddenElements: true })).toHaveLength(
      0,
    );
    const cells = screen.getAllByTestId(/^tab-cell-/);
    const totalBasis = cells.reduce(
      (sum, cellView) => sum + ((flat<ViewStyle>(cellView.props.style).flexBasis as number) ?? 0),
      0,
    );
    const slackPerCell = (472 - totalBasis) / cells.length;
    cells.forEach((cellView, index) => {
      const cell = flat<ViewStyle>(cellView.props.style);
      const expected = expectedWidths[index] as number;
      expect(cell.flex).toBeUndefined();
      expect(cell.width).toBeUndefined();
      expect(cell.flexBasis).toBeCloseTo(expected + 4, 5);
      expect(cell.flexGrow).toBe(1);
      expect(cell.flexShrink).toBe(0);
      const share = (cell.flexBasis as number) + slackPerCell;
      expect(share).toBeGreaterThanOrEqual(expected + 4);
    });
    for (const tab of screen.getAllByRole("tab")) {
      expect(flat<ViewStyle>(tab.props.style)).toMatchObject({ minHeight: 48, minWidth: 48 });
    }
    for (const item of TABS) {
      expect(screen.getByText(item.label).props.allowFontScaling).not.toBe(false);
    }
  });

  it("switches from proportional to scroll when measured Home width pushes the sum over the bar width", async () => {
    // At 2x on a 480pt phone (tablist 472pt): estimate sum * 1.1 = 469.48 <= 472 (proportional),
    // then measured cell widths [116, 132, 100, 56, 72] sum to 476 > 472 -> scroll.
    phone(2, 480);
    await renderBar("home", "light", 2);
    expect(screen.queryByTestId("tab-scroll")).toBeNull();

    await measureLabels({ home: 108, accounts: 124, budget: 92, taxAndPay: 48, more: 64 });
    expect(screen.getByTestId("tab-scroll").props.horizontal).toBe(true);
    for (const cellView of screen.getAllByTestId(/^tab-cell-/)) {
      const cell = flat<ViewStyle>(cellView.props.style);
      expect(cell.flex).toBeUndefined();
      expect(cell.flexGrow).toBeUndefined();
      expect(cell.flexShrink).toBe(0);
    }
  });

  it("starts in scroll near the proportional limit before measurement, then switches to proportional when measured widths fit", async () => {
    // At 2x on a 440pt phone (tablist 432pt): estimate sum 426.8 <= 432 < 469.48 -> scroll first.
    phone(2, 440);
    await renderBar("home", "light", 2);
    expect(screen.getByTestId("tab-scroll").props.horizontal).toBe(true);

    // Measured cell widths [70, 122, 92, 50, 70] (+ 4pt margin each = 424 <= 432) -> proportional.
    await measureLabels({ home: 62, accounts: 114, budget: 84, taxAndPay: 42, more: 62 });
    expect(screen.queryByTestId("tab-scroll")).toBeNull();
    const expectedCells = [70, 122, 92, 50, 70] as const;
    screen.getAllByTestId(/^tab-cell-/).forEach((cellView, index) => {
      const cell = flat<ViewStyle>(cellView.props.style);
      const expected = expectedCells[index] as number;
      expect(cell.flexBasis).toBe(expected + 4);
      expect(cell.flexGrow).toBe(1);
      expect(cell.flexShrink).toBe(0);
    });
  });

  it("discards stale measurements and re-measures when font scale changes", async () => {
    phone(1, 440);
    const view = await render(
      <ThemeProvider scheme="light" textScale={1}>
        <TabBar items={TABS} activeKey="home" onSelect={jest.fn()} />
      </ThemeProvider>,
    );
    const measureRow = screen.getByTestId("tab-measure-row", { includeHiddenElements: true });
    expect(measureRow.props.pointerEvents).toBe("none");
    expect(measureRow.props.accessibilityElementsHidden).toBe(true);
    expect(measureRow.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(flat<ViewStyle>(measureRow.props.style)).toMatchObject({
      position: "absolute",
      opacity: 0,
    });

    // At 1x: cells [48, 70, 54, 48, 48], 70 * 5 = 350 <= 432 -> equal.
    await measureLabels({ home: 36, accounts: 62, budget: 46, taxAndPay: 26, more: 36 });
    for (const cellView of screen.getAllByTestId(/^tab-cell-/)) {
      expect(flat<ViewStyle>(cellView.props.style)).toMatchObject({ flex: 1, flexBasis: 0 });
    }

    // Switching to 2x discards 1x widths so pre-measurement chooses scroll (469.48 > 432).
    phone(2, 440);
    await view.rerender(
      <ThemeProvider scheme="light" textScale={2}>
        <TabBar items={TABS} activeKey="home" onSelect={jest.fn()} />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("tab-scroll").props.horizontal).toBe(true);

    // Once new 2x measurements arrive ([70, 122, 92, 50, 70], + 4pt each = 424 <= 432), switches to proportional.
    await measureLabels({ home: 62, accounts: 114, budget: 84, taxAndPay: 42, more: 62 });
    expect(screen.queryByTestId("tab-scroll")).toBeNull();
    const expectedCells = [70, 122, 92, 50, 70] as const;
    screen.getAllByTestId(/^tab-cell-/).forEach((cellView, index) => {
      const cell = flat<ViewStyle>(cellView.props.style);
      expect(cell.flexBasis).toBe((expectedCells[index] as number) + 4);
      expect(cell.flexGrow).toBe(1);
      expect(cell.flexShrink).toBe(0);
    });
  });

  it("at the proportional boundary width, gives each proportional cell flexBasis = label width + padding + 4 and flexGrow 1", async () => {
    // Measured widths [66, 126, 94, 48, 66] + 8pt horizontal pill padding = [74, 134, 102, 56, 74].
    // Exact proportional boundary width = 440 + 5 * 4 = 460 (phone width 468 minus 8pt bar padding).
    phone(2, 468);
    await renderBar("home", "light", 2);
    await measureLabels({ home: 66, accounts: 126, budget: 94, taxAndPay: 48, more: 66 });
    expect(screen.queryByTestId("tab-scroll")).toBeNull();

    const expectedFlexBasis = [78, 138, 106, 60, 78] as const;
    screen.getAllByTestId(/^tab-cell-/).forEach((cellView, index) => {
      const cell = flat<ViewStyle>(cellView.props.style);
      expect(cell.flex).toBeUndefined();
      expect(cell.width).toBeUndefined();
      expect(cell.flexBasis).toBe(expectedFlexBasis[index]);
      expect(cell.flexGrow).toBe(1);
      expect(cell.flexShrink).toBe(0);
    });
  });

  it("at 200% text on a 411 point phone (cold start), scrolls horizontally without clamping labels", async () => {
    phone(2, 411);
    await renderBar("home", "light", 2);
    expect(rows().map((row) => row.tabs)).toEqual([
      ["tab-home", "tab-accounts", "tab-budget", "tab-taxAndPay", "tab-more"],
    ]);
    expect(screen.queryAllByTestId(/^tab-.+-icon$/, { includeHiddenElements: true })).toHaveLength(
      0,
    );
    const scroller = screen.getByTestId("tab-scroll");
    expect(scroller.props.horizontal).toBe(true);
    for (const cellView of screen.getAllByTestId(/^tab-cell-/)) {
      const cell = flat<ViewStyle>(cellView.props.style);
      expect(cell.flex).toBeUndefined();
      expect(cell.flexGrow).toBeUndefined();
      expect(cell.flexShrink).toBe(0);
    }
    for (const item of TABS) {
      expect(screen.getByText(item.label).props.numberOfLines).toBeUndefined();
    }
  });

  it("when scrolling, scrolls the active tab into view on mount and when activeKey changes", async () => {
    phone(2, 320);
    const scrollTo = jest.spyOn(ScrollView.prototype, "scrollTo").mockImplementation(() => {});
    scrollTo.mockClear();
    const onSelect = jest.fn();
    const view = await render(
      <ThemeProvider scheme="light" textScale={2}>
        <TabBar items={TABS} activeKey="more" onSelect={onSelect} />
      </ThemeProvider>,
    );
    await fireEvent(screen.getByTestId("tab-bar"), "layout", {
      nativeEvent: { layout: { width: 312 } },
    });
    await fireEvent(screen.getByTestId("tab-scroll"), "contentSizeChange", 370, 48);
    await fireEvent(screen.getByTestId("tab-cell-more"), "layout", {
      nativeEvent: { layout: { x: 310, width: 60 } },
    });
    // maxScroll = 370 - 312 = 58; "more" is past the right edge so it scrolls to 58.
    expect(scrollTo).toHaveBeenCalledWith({ x: 58, animated: false });

    scrollTo.mockClear();
    await fireEvent(screen.getByTestId("tab-scroll"), "scroll", {
      nativeEvent: { contentOffset: { x: 58 } },
    });
    await fireEvent(screen.getByTestId("tab-cell-home"), "layout", {
      nativeEvent: { layout: { x: 0, width: 60 } },
    });
    await view.rerender(
      <ThemeProvider scheme="light" textScale={2}>
        <TabBar items={TABS} activeKey="home" onSelect={onSelect} />
      </ThemeProvider>,
    );
    // "home" at x = 0 is off the left edge while scrolled to 58; switching to it scrolls back to 0.
    expect(scrollTo).toHaveBeenCalledWith({ x: 0, animated: false });
  });

  it("does not re-render on scroll frames while overflow cues stay unchanged", async () => {
    phone(2, 320);
    const onRender = jest.fn();
    await render(
      <ThemeProvider scheme="light" textScale={2}>
        <Profiler id="tab-bar" onRender={onRender}>
          <TabBar items={TABS} activeKey="home" onSelect={jest.fn()} />
        </Profiler>
      </ThemeProvider>,
    );
    const scroller = screen.getByTestId("tab-scroll");
    await fireEvent(screen.getByTestId("tab-bar"), "layout", {
      nativeEvent: { layout: { width: 312, height: 48 } },
    });
    await fireEvent(scroller, "contentSizeChange", 370, 48);
    await fireEvent(scroller, "scroll", { nativeEvent: { contentOffset: { x: 20 } } });
    expect(screen.getByTestId("tab-fade-left", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId("tab-fade-right", { includeHiddenElements: true })).toBeTruthy();

    onRender.mockClear();
    await fireEvent(scroller, "scroll", { nativeEvent: { contentOffset: { x: 25 } } });
    await fireEvent(scroller, "scroll", { nativeEvent: { contentOffset: { x: 30 } } });
    await fireEvent(scroller, "scroll", { nativeEvent: { contentOffset: { x: 35 } } });
    expect(onRender).not.toHaveBeenCalled();

    await fireEvent(scroller, "scroll", { nativeEvent: { contentOffset: { x: 58 } } });
    expect(onRender).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("tab-fade-left", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId("tab-fade-right", { includeHiddenElements: true })).toBeNull();

    onRender.mockClear();
    await fireEvent(scroller, "scroll", { nativeEvent: { contentOffset: { x: 59 } } });
    expect(onRender).not.toHaveBeenCalled();
  });

  it("gives each edge fade a safe SVG gradient id matching its url(#...) fill", async () => {
    interface JsonNode {
      type: string;
      props: Record<string, unknown>;
      children: (JsonNode | string)[] | null;
    }
    const findNodes = (root: unknown, predicate: (node: JsonNode) => boolean): JsonNode[] => {
      const found: JsonNode[] = [];
      const walk = (node: unknown) => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) {
          for (const item of node) walk(item);
          return;
        }
        const candidate = node as JsonNode;
        if (predicate(candidate)) found.push(candidate);
        for (const child of candidate.children ?? []) walk(child);
      };
      walk(root);
      return found;
    };
    const fadeNodes = (testID: string) => {
      const [fade] = findNodes(screen.toJSON(), (n) => n.props.testID === testID);
      const [gradient] = findNodes(fade, (n) => n.type === "RNSVGLinearGradient");
      const [rect] = findNodes(fade, (n) => n.type === "RNSVGRect");
      return {
        gradientId: gradient?.props.name as string,
        brushRef: (rect?.props.fill as { type: number; brushRef: string } | undefined)?.brushRef,
      };
    };

    const SAFE_ID = /^[A-Za-z0-9_-]+$/;
    const useIdSpy = jest
      .spyOn(require("react") as typeof import("react"), "useId")
      .mockReturnValue(":r0:");
    phone(2, 320);
    await renderBar();
    await fireEvent(screen.getByTestId("tab-bar"), "layout", {
      nativeEvent: { layout: { width: 312, height: 48 } },
    });
    const mocked = fadeNodes("tab-fade-right");
    expect(mocked.gradientId).toMatch(SAFE_ID);
    expect(mocked.gradientId).not.toContain(":");
    expect(mocked.brushRef).toBe(mocked.gradientId);

    useIdSpy.mockRestore();
    await renderBar();
    await fireEvent(screen.getByTestId("tab-bar"), "layout", {
      nativeEvent: { layout: { width: 312, height: 48 } },
    });
    await fireEvent(screen.getByTestId("tab-scroll"), "contentSizeChange", 370, 48);
    await fireEvent(screen.getByTestId("tab-scroll"), "scroll", {
      nativeEvent: { contentOffset: { x: 20 } },
    });
    const left = fadeNodes("tab-fade-left");
    const right = fadeNodes("tab-fade-right");
    expect(left.gradientId).toMatch(SAFE_ID);
    expect(right.gradientId).toMatch(SAFE_ID);
    expect(left.brushRef).toBe(left.gradientId);
    expect(right.brushRef).toBe(right.gradientId);
    expect(left.gradientId).not.toBe(right.gradientId);
  });

  it("sizes EdgeFade numerically from tablist height, renders nothing at height 0, and stretches the bar", async () => {
    interface JsonNode {
      type: string;
      props: Record<string, unknown>;
      children: (JsonNode | string)[] | null;
    }
    const findNodes = (root: unknown, predicate: (node: JsonNode) => boolean): JsonNode[] => {
      const found: JsonNode[] = [];
      const walk = (node: unknown) => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) {
          for (const item of node) walk(item);
          return;
        }
        const candidate = node as JsonNode;
        if (predicate(candidate)) found.push(candidate);
        for (const child of candidate.children ?? []) walk(child);
      };
      walk(root);
      return found;
    };

    phone(2, 320);
    await renderBar("home", "light", 2);
    const root = screen.toJSON() as JsonNode;
    expect(flat<ViewStyle>(root.props.style).alignSelf).toBe("stretch");
    expect(flat<ViewStyle>(screen.getByTestId("tab-bar").props.style).alignSelf).toBe("stretch");

    // Before layout reports a non-zero height, EdgeFade renders nothing.
    expect(screen.queryByTestId("tab-fade-right", { includeHiddenElements: true })).toBeNull();

    await fireEvent(screen.getByTestId("tab-bar"), "layout", {
      nativeEvent: { layout: { width: 200, height: 56 } },
    });

    const [fade] = findNodes(screen.toJSON(), (n) => n.props.testID === "tab-fade-right");
    const [svg] = findNodes(fade, (n) => n.type === "RNSVGSvgView");
    const [rect] = findNodes(fade, (n) => n.type === "RNSVGRect");
    expect(svg?.props.bbWidth).toBe(24);
    expect(svg?.props.bbHeight).toBe(56);
    expect(flat<ViewStyle>(svg?.props.style)).toMatchObject({ width: 24, height: 56 });
    expect(rect?.props.width).toBe(24);
    expect(rect?.props.height).toBe(56);
  });

  it.each(Object.entries(tabBarStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<TabBar {...props} />);
  });

  it("at 411 points and 1.5x text, gives every cell its label width plus padding and safety margin, or scrolls", async () => {
    // Device numbers at 1.5x (420 dpi = 2.625 px/dp): Home measured 47.6 dp (125 px);
    // Gallery tablist width = (1080 - 2 * 98) / 2.625 = 336.8 dp (337).
    const measuredAt15 = { home: 47.6, accounts: 74.25, budget: 55.8, taxAndPay: 29.4, more: 40.8 };
    const orderedMeasured = [47.6, 74.25, 55.8, 29.4, 40.8] as const;

    for (const barWidth of [337, 403]) {
      phone(1.5, 411);
      await renderBar("home", "light", 1.5);
      await fireEvent(screen.getByTestId("tab-bar"), "layout", {
        nativeEvent: { layout: { width: barWidth, height: 48 } },
      });
      await measureLabels(measuredAt15);

      if (screen.queryByTestId("tab-scroll") !== null) {
        expect(screen.getByTestId("tab-scroll").props.horizontal).toBe(true);
        continue;
      }

      const cells = screen.getAllByTestId(/^tab-cell-/);
      const bases = cells.map(
        (cellView) => flat<ViewStyle>(cellView.props.style).flexBasis as number,
      );
      const totalBasis = bases.reduce((sum, b) => sum + b, 0);
      const slackPerCell = Math.max(0, (barWidth - totalBasis) / cells.length);
      orderedMeasured.forEach((labelWidth, index) => {
        const cellWidth = (bases[index] as number) + slackPerCell;
        // 8 dp horizontal pill padding + 4 dp Android rounding/hinting margin.
        expect(cellWidth + 1e-6).toBeGreaterThanOrEqual(labelWidth + 8 + 4);
      });
    }
  });

  it("backstop: switches to scroll when a visible label wraps to two lines and latches for the same key", async () => {
    phone(1.5, 411);
    await renderBar("home", "light", 1.5);
    await fireEvent(screen.getByTestId("tab-bar"), "layout", {
      nativeEvent: { layout: { width: 337, height: 48 } },
    });
    await measureLabels({ home: 47.6, accounts: 74.25, budget: 55.8, taxAndPay: 29.4, more: 40.8 });
    expect(screen.queryByTestId("tab-scroll")).toBeNull();

    // Single-line textLayout keeps the fixed row.
    await fireEvent(screen.getByText("Home"), "textLayout", {
      nativeEvent: { lines: [{ text: "Home", width: 47.6, height: 23.6 }] },
    });
    expect(screen.queryByTestId("tab-scroll")).toBeNull();

    // Two-line textLayout switches to scroll.
    await fireEvent(screen.getByText("Home"), "textLayout", {
      nativeEvent: {
        lines: [
          { text: "Hom", width: 38, height: 23.6 },
          { text: "e", width: 10, height: 23.6 },
        ],
      },
    });
    expect(screen.getByTestId("tab-scroll").props.horizontal).toBe(true);

    // Repeated layout events for the same (width, textScale, labels) key stay in scroll mode.
    await fireEvent(screen.getByTestId("tab-bar"), "layout", {
      nativeEvent: { layout: { width: 337, height: 48 } },
    });
    await fireEvent(
      screen.getByTestId("tab-measure-home", { includeHiddenElements: true }),
      "layout",
      {
        nativeEvent: { layout: { width: 47.6, height: 24 } },
      },
    );
    expect(screen.getByTestId("tab-scroll").props.horizontal).toBe(true);

    // Changing the bar width changes the key and allows fixed layout again.
    await fireEvent(screen.getByTestId("tab-bar"), "layout", {
      nativeEvent: { layout: { width: 600, height: 48 } },
    });
    expect(screen.queryByTestId("tab-scroll")).toBeNull();

    // Equal mode also switches to scroll and latches on two-line textLayout.
    phone(1, 411);
    await renderBar("home", "light", 1);
    await fireEvent(screen.getByTestId("tab-bar"), "layout", {
      nativeEvent: { layout: { width: 403, height: 48 } },
    });
    expect(screen.queryByTestId("tab-scroll")).toBeNull();
    await fireEvent(screen.getByText("Home"), "textLayout", {
      nativeEvent: {
        lines: [
          { text: "Hom", width: 26, height: 16.8 },
          { text: "e", width: 8, height: 16.8 },
        ],
      },
    });
    expect(screen.getByTestId("tab-scroll").props.horizontal).toBe(true);
    await fireEvent(screen.getByTestId("tab-bar"), "layout", {
      nativeEvent: { layout: { width: 403, height: 48 } },
    });
    expect(screen.getByTestId("tab-scroll").props.horizontal).toBe(true);
  });

  it("keeps the measuring row unconstrained, uses the wider of onLayout and onTextLayout, and ignores stale-key callbacks", async () => {
    phone(1, 411);
    const view = await render(
      <ThemeProvider scheme="light" textScale={1}>
        <TabBar items={TABS} activeKey="home" onSelect={jest.fn()} />
      </ThemeProvider>,
    );
    const measureRow = screen.getByTestId("tab-measure-row", { includeHiddenElements: true });
    const measureStyle = flat<ViewStyle>(measureRow.props.style);
    expect(measureStyle.alignItems).toBe("flex-start");
    expect(typeof measureStyle.width).toBe("number");
    expect(measureStyle.width as number).toBeGreaterThanOrEqual(4000);

    const staleHomeOnLayout = screen.getByTestId("tab-measure-home", {
      includeHiddenElements: true,
    }).props.onLayout as (event: {
      nativeEvent: { layout: { width: number; height: number } };
    }) => void;

    // Rerender at 1.5x and fire the stale 1x callback; it must be ignored.
    phone(1.5, 411);
    await view.rerender(
      <ThemeProvider scheme="light" textScale={1.5}>
        <TabBar items={TABS} activeKey="home" onSelect={jest.fn()} />
      </ThemeProvider>,
    );
    await fireEvent(screen.getByTestId("tab-bar"), "layout", {
      nativeEvent: { layout: { width: 337, height: 48 } },
    });
    staleHomeOnLayout({ nativeEvent: { layout: { width: 999, height: 24 } } });
    await measureLabels({ home: 47, accounts: 74.25, budget: 55.8, taxAndPay: 29.4, more: 40.8 });
    expect(screen.queryByTestId("tab-scroll")).toBeNull();

    // When onTextLayout reports a wider line (48.5) than rounded-down onLayout (47), flexBasis uses 48.5.
    await fireEvent(
      screen.getByTestId("tab-measure-home", { includeHiddenElements: true }),
      "textLayout",
      { nativeEvent: { lines: [{ text: "Home", width: 48.5, height: 24 }] } },
    );
    const homeCell = flat<ViewStyle>(screen.getByTestId("tab-cell-home").props.style);
    expect(homeCell.flexBasis).toBe(48.5 + 8 + 4);
  });
});

describe("tabLayout", () => {
  // label.sm is 12 points; the five labels are Home (4), Accounts (8), Budget (6), Pay (3), More (4).
  const labels = TABS.map((item) => item.label);
  const at = (width: number, textScale: number) =>
    tabLayout({ labels, width, fontSize: 12 * textScale, textScale });
  const atMeasured = (width: number, textScale: number, measuredLabelWidths: readonly number[]) =>
    tabLayout({ labels, width, fontSize: 12 * textScale, textScale, measuredLabelWidths });

  it("before measurement, uses equal when longest fits and scroll when anywhere near the proportional limit", () => {
    // 1x (fontSize 12): max(48, (len * 12 * 0.58 + 8) * 1.1) -> [48, 70.048, 54.736, 48, 48].
    // Longest * 5 = 350.24, sum = 268.784, scrollThreshold = 268.784 * 1.1 = 295.6624.
    const res = at(351, 1);
    expect(res.mode).toBe("equal");
    expect(res.showIcons).toBe(true);
    for (const [i, w] of [48, 70.048, 54.736, 48, 48].entries()) {
      expect(res.labelWidths[i]).toBeCloseTo(w, 5);
    }
    expect(at(360, 1)).toMatchObject({ mode: "equal", showIcons: true });
    expect(at(351, 1)).toMatchObject({ mode: "equal", showIcons: true });
    expect(at(350, 1)).toMatchObject({ mode: "proportional", showIcons: true });
    expect(at(312, 1)).toMatchObject({ mode: "proportional", showIcons: true });
    expect(at(296, 1)).toMatchObject({ mode: "proportional", showIcons: true });
    expect(at(295, 1)).toMatchObject({ mode: "scroll", showIcons: true });
  });

  it("before measurement at 200% text, picks scroll near the proportional limit and equal above longest * 5", () => {
    // 2x (fontSize 24): [70.048, 131.296, 100.672, 54.736, 70.048].
    // Longest * 5 = 656.48; Sum = 426.8; scrollThreshold = 426.8 * 1.1 = 469.48.
    const res = at(657, 2);
    expect(res.mode).toBe("equal");
    expect(res.showIcons).toBe(false);
    for (const [i, w] of [70.048, 131.296, 100.672, 54.736, 70.048].entries()) {
      expect(res.labelWidths[i]).toBeCloseTo(w, 5);
    }
    expect(at(656, 2)).toMatchObject({ mode: "proportional", showIcons: false });
    expect(at(480, 2)).toMatchObject({ mode: "proportional", showIcons: false });
    expect(at(470, 2)).toMatchObject({ mode: "proportional", showIcons: false });
    expect(at(469, 2)).toMatchObject({ mode: "scroll", showIcons: false });
    expect(at(427, 2)).toMatchObject({ mode: "scroll", showIcons: false });
    expect(at(412, 2)).toMatchObject({ mode: "scroll", showIcons: false });
    expect(at(312, 2)).toMatchObject({ mode: "scroll", showIcons: false });

    // Identical labels at 2x: longest * 5 = sum = 350.24, scrollThreshold = 385.264 -> near limit chooses scroll.
    const same = tabLayout({
      labels: ["Home", "Home", "Home", "Home", "Home"],
      width: 351,
      fontSize: 24,
      textScale: 2,
    });
    expect(same.mode).toBe("scroll");
  });

  it("hides icons from 1.5x and switches across equal, proportional and scroll", () => {
    // 1.5x (fontSize 18): [54.736, 100.672, 77.704, 48, 54.736]; longest * 5 = 503.36,
    // sum = 335.848, scrollThreshold = 369.4328.
    expect(at(504, 1.5)).toMatchObject({ mode: "equal", showIcons: false });
    expect(at(370, 1.5)).toMatchObject({ mode: "proportional", showIcons: false });
    expect(at(369, 1.5)).toMatchObject({ mode: "scroll", showIcons: false });
    // Just under 1.5x (1.49x, fontSize 17.88):
    // longest = (8 * 17.88 * 0.58 + 8) * 1.1 = 100.05952 -> * 5 = 500.2976;
    // sum = 334.16368, scrollThreshold = 367.580048.
    expect(at(367, 1.49)).toMatchObject({ mode: "scroll", showIcons: true });
    expect(at(368, 1.49)).toMatchObject({ mode: "proportional", showIcons: true });
    expect(at(501, 1.49)).toMatchObject({ mode: "equal", showIcons: true });
  });

  it("at 411 points and 200% text, picks scroll using the conservative selected-weight estimate", () => {
    const res = at(411, 2);
    expect(res.mode).toBe("scroll");
    expect(res.showIcons).toBe(false);
    for (const [i, w] of [70.048, 131.296, 100.672, 54.736, 70.048].entries()) {
      expect(res.labelWidths[i]).toBeCloseTo(w, 5);
    }
  });

  it("from measured label widths, picks scroll when wider than estimate, exact equal/proportional boundaries with 4pt per-label margin, and keeps every share >= measured cell width", () => {
    // Measured widths [66, 126, 94, 48, 66] + 8pt horizontal pill padding = [74, 134, 102, 56, 74].
    // With 4pt per-label Android margin (5 labels):
    // - Proportional/scroll boundary: sum = 74 + 134 + 102 + 56 + 74 = 440; sum + 5 * 4 = 460.
    //   At 440 (exact sum) and 459 (sum + 19), mode is "scroll"; at 460 (sum + 5 * 4), "proportional".
    // - Equal/proportional boundary: longest = 134; (134 + 4) * 5 = 690 (longest * 5 = 670).
    //   At 670 and 689, mode is "proportional"; at 690, "equal".
    const measured = [66, 126, 94, 48, 66] as const;
    const eq = atMeasured(690, 2, measured);
    expect(eq.mode).toBe("equal");
    expect(eq.labelWidths).toEqual([74, 134, 102, 56, 74]);
    expect(atMeasured(689, 2, measured).mode).toBe("proportional");
    expect(atMeasured(670, 2, measured).mode).toBe("proportional");
    expect(atMeasured(460, 2, measured).mode).toBe("proportional");
    expect(atMeasured(459, 2, measured).mode).toBe("scroll");
    expect(atMeasured(440, 2, measured).mode).toBe("scroll");

    // Measured "Home" wider than estimate at width 472 (where estimate says proportional) -> scroll.
    expect(at(472, 2).mode).toBe("proportional");
    expect(atMeasured(472, 2, [108, 124, 92, 48, 64]).mode).toBe("scroll");

    // Short measured labels still clamp to the 48pt minimum tab width.
    expect(atMeasured(400, 1, [36, 62, 46, 26, 36]).labelWidths).toEqual([48, 70, 54, 48, 48]);

    // Every equal and proportional share is at least the measured cell width.
    for (const width of [460, 480, 689, 690, 720]) {
      const res = atMeasured(width, 2, measured);
      expect(res.mode).not.toBe("scroll");
      const total = res.labelWidths.reduce((sum, w) => sum + w, 0);
      for (const cellWidth of res.labelWidths) {
        const share = res.mode === "equal" ? width / labels.length : (width * cellWidth) / total;
        expect(share + 1e-6).toBeGreaterThanOrEqual(cellWidth);
      }
    }
  });

  // Hand-worked 1.0x base label widths derived from device numbers:
  // Home measured 47.6 dp (125 px at 420 dpi) at 1.5x -> 47.6 / 1.5 = 31.73 dp at 1.0x.
  // Scaled proportionally for the five labels: [31.73, 49.5, 37.2, 19.6, 27.2].
  // At 1.8x on a 360 dp bar: [57.11, 89.1, 66.96, 35.28, 48.96] + 8 dp padding = [65.11, 97.1, 74.96, 48, 56.96], sum = 342.13.
  // With only 1 dp margin, sum + 5 = 347.13 <= 360 chooses proportional with only 3.57 dp per cell (< 4 dp Android margin).
  it.each(
    [1.0, 1.15, 1.3, 1.5, 1.8, 2.0].flatMap((scale) => [
      ...[360, 411].map((barWidth) => ({ barWidth, scale })),
      ...(scale === 1.5 ? [{ barWidth: 337, scale }] : []),
    ]),
  )(
    "at bar width $barWidth dp and $scale x scale, either every cell fits label + 8 dp padding + 4 dp margin or mode is scroll",
    ({ barWidth, scale }) => {
      const baseWidths = [31.73, 49.5, 37.2, 19.6, 27.2] as const;
      const measured = baseWidths.map((w) => Number((w * scale).toFixed(2)));
      const res = atMeasured(barWidth, scale, measured);
      if (res.mode === "scroll") return;

      const cellWidths =
        res.mode === "equal"
          ? measured.map(() => barWidth / labels.length)
          : (() => {
              const bases = res.labelWidths.map((w) => w + LABEL_FIT_EPSILON);
              const totalBasis = bases.reduce((sum, b) => sum + b, 0);
              const slackPerCell = Math.max(0, (barWidth - totalBasis) / labels.length);
              return bases.map((b) => b + slackPerCell);
            })();

      measured.forEach((labelWidth, index) => {
        expect((cellWidths[index] as number) + 1e-6).toBeGreaterThanOrEqual(labelWidth + 8 + 4);
      });
    },
  );
});

describe("overflowCues and scrollTargetForTab", () => {
  it("reports edge fades only when the row scrolls and content extends past that edge", () => {
    expect(
      overflowCues({ scroll: false, scrollX: 20, viewportWidth: 312, contentWidth: 370 }),
    ).toEqual({
      left: false,
      right: false,
    });
    expect(
      overflowCues({ scroll: true, scrollX: 0, viewportWidth: 312, contentWidth: 370 }),
    ).toEqual({
      left: false,
      right: true,
    });
    expect(
      overflowCues({ scroll: true, scrollX: 20, viewportWidth: 312, contentWidth: 370 }),
    ).toEqual({
      left: true,
      right: true,
    });
    expect(
      overflowCues({ scroll: true, scrollX: 58, viewportWidth: 312, contentWidth: 370 }),
    ).toEqual({
      left: true,
      right: false,
    });
  });

  it("returns null when the active tab is clear of edge fades, and centres clamped otherwise", () => {
    // Viewport 312, content 370, scrollX 0: leftInset 0, rightInset 24 -> visible [0, 288].
    expect(
      scrollTargetForTab({
        cellX: 61,
        cellWidth: 114,
        scrollX: 0,
        viewportWidth: 312,
        contentWidth: 370,
        edgePadding: 24,
      }),
    ).toBeNull();
    // Cell under the right fade [270, 330] -> centres at 270 + 30 - 156 = 144, clamped to 58.
    expect(
      scrollTargetForTab({
        cellX: 270,
        cellWidth: 60,
        scrollX: 0,
        viewportWidth: 312,
        contentWidth: 370,
        edgePadding: 24,
      }),
    ).toBe(58);
    // Scrolled to 58 (leftInset 24, rightInset 0 -> visible [82, 370]); cell [60, 120] is under left fade.
    expect(
      scrollTargetForTab({
        cellX: 60,
        cellWidth: 60,
        scrollX: 58,
        viewportWidth: 312,
        contentWidth: 370,
        edgePadding: 24,
      }),
    ).toBe(0);
  });
});
