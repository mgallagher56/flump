import { dark, light } from "@flump/tokens/native";
import { fireEvent, render, screen, userEvent, within } from "@testing-library/react-native";
import { Dimensions, ScrollView, StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { TABS } from "../../navigation/navItems";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { TabBar } from "./TabBar";
import { tabBarStates } from "./TabBar.states";
import { overflowCues, scrollTargetForTab, tabLayout } from "./TabBar.styles";

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
    // Right overflow fade shown initially; no left fade at scroll x = 0.
    const rightFade = screen.getByTestId("tab-fade-right", { includeHiddenElements: true });
    expect(rightFade.props.pointerEvents).toBe("none");
    expect(screen.queryByTestId("tab-fade-left", { includeHiddenElements: true })).toBeNull();

    await fireEvent(screen.getByTestId("tab-bar"), "layout", {
      nativeEvent: { layout: { width: 312 } },
    });
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

  it("at 200% text on a wider phone (412 points), keeps one fixed row without scrolling", async () => {
    // At 2x (fontSize 24): Home 60.8 + Accounts 113.6 + Budget 87.2 + Pay 47.6 + More 60.8 = 370 <= 412.
    phone(2, 412);
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
    for (const cellView of screen.getAllByTestId(/^tab-cell-/)) {
      expect(flat<ViewStyle>(cellView.props.style)).toMatchObject({ flex: 1, flexBasis: 0 });
    }
    for (const tab of screen.getAllByRole("tab")) {
      expect(flat<ViewStyle>(tab.props.style)).toMatchObject({ minHeight: 48, minWidth: 48 });
    }
    for (const item of TABS) {
      expect(screen.getByText(item.label).props.allowFontScaling).not.toBe(false);
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

  it.each(Object.entries(tabBarStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<TabBar {...props} />);
  });
});

describe("tabLayout", () => {
  // label.sm is 12 points; the five labels are Home (4), Accounts (8), Budget (6), Pay (3), More (4).
  const labels = TABS.map((item) => item.label);
  const at = (width: number, textScale: number) =>
    tabLayout({ labels, width, fontSize: 12 * textScale, textScale });

  it("keeps the five tabs on one fixed row at 320 points and the normal size, with icons", () => {
    // 1x (fontSize 12): (4+8+6+3+4) * 12 * 0.55 + 5 * 8 = 165 + 40 = 205 <= 312.
    expect(at(312, 1)).toEqual({ scroll: false, showIcons: true });
  });

  it("at 200% text, scrolls on a narrow width and keeps one fixed row on a wider width", () => {
    // 2x (fontSize 24):
    // Home:     4 * 24 * 0.55 + 8 =  60.8
    // Accounts: 8 * 24 * 0.55 + 8 = 113.6
    // Budget:   6 * 24 * 0.55 + 8 =  87.2
    // Pay:      3 * 24 * 0.55 + 8 =  47.6
    // More:     4 * 24 * 0.55 + 8 =  60.8
    // Sum = 370 points. 312 and 369 < 370 (scroll); 370 and 412 >= 370 (fixed row).
    expect(at(312, 2)).toEqual({ scroll: true, showIcons: false });
    expect(at(369, 2)).toEqual({ scroll: true, showIcons: false });
    expect(at(370, 2)).toEqual({ scroll: false, showIcons: false });
    expect(at(412, 2)).toEqual({ scroll: false, showIcons: false });
  });

  it("hides icons from 1.5x and switches to scrolling only when the sum exceeds width", () => {
    // 1.5x (fontSize 18): 25 * 18 * 0.55 + 40 = 247.5 + 40 = 287.5 points.
    expect(at(312, 1.5)).toEqual({ scroll: false, showIcons: false });
    expect(at(287, 1.5)).toEqual({ scroll: true, showIcons: false });
    // Just under 1.5x (1.49x, fontSize 17.88): 25 * 17.88 * 0.55 + 40 = 285.85 points.
    expect(at(280, 1.49)).toEqual({ scroll: true, showIcons: true });
    expect(at(286, 1.49)).toEqual({ scroll: false, showIcons: true });
  });
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
