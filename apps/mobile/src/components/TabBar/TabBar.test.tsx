import { dark, light } from "@flump/tokens/native";
import { render, screen, userEvent, within } from "@testing-library/react-native";
import { Dimensions, StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { TABS } from "../../navigation/navItems";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { TabBar } from "./TabBar";
import { tabBarStates } from "./TabBar.states";
import { tabLayout } from "./TabBar.styles";

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

describe("TabBar", () => {
  beforeEach(() => {
    phone();
  });
  afterEach(() => {
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
    jest.useRealTimers();
    const user = userEvent.setup();
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

  it("at 200% text on 320 points, rows of two with a spacer keeping the last tab's width", async () => {
    phone(2);
    await renderBar();
    expect(rows().map((row) => row.tabs)).toEqual([
      ["tab-home", "tab-accounts"],
      ["tab-budget", "tab-taxAndPay"],
      ["tab-more"],
    ]);
    const last = screen.getAllByTestId("tab-row")[2];
    expect(last?.children).toHaveLength(2);
  });

  it.each(Object.entries(tabBarStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<TabBar {...props} />);
  });
});

describe("tabLayout", () => {
  // label.sm is 12 points; the longest label, "Accounts", has 8 characters.
  const at = (width: number, textScale: number) =>
    tabLayout({ count: 5, width, longestLabel: 8, fontSize: 12 * textScale, textScale });

  it("keeps the five tabs on one row at 320 points and the normal size, with icons", () => {
    // 8 x 12 x 0.55 + 8 = 60.8 points a label; 312 points of bar (320 less 4 each side) fit 5.
    expect(at(312, 1)).toEqual({ columns: 5, rows: 1, showIcons: true });
  });

  it("at 200% text on 320 points, two a row over three rows, labels only", () => {
    // 8 x 24 x 0.55 + 8 = 113.6 points a label; 312 / 113.6 fits 2; five at two a row is 3 rows.
    expect(at(312, 2)).toEqual({ columns: 2, rows: 3, showIcons: false });
  });

  it("spreads tabs evenly: 1.5 times text on 320 points is three and two, not four and one", () => {
    // 8 x 18 x 0.55 + 8 = 87.2 points a label; 312 / 87.2 fits 3; five tabs is 2 rows of 3.
    expect(at(312, 1.5)).toMatchObject({ columns: 3, rows: 2, showIcons: false });
    // Just under 1.5: 8 x 17.4 x 0.55 + 8 = 84.56; 312 / 84.56 fits 3; icons stay.
    expect(at(312, 1.45)).toMatchObject({ columns: 3, rows: 2, showIcons: true });
  });

  it("a wide phone at 1.25 times text keeps one row", () => {
    // 8 x 15 x 0.55 + 8 = 74 points a label; 422 / 74 fits 5.
    expect(at(422, 1.25)).toMatchObject({ columns: 5, rows: 1 });
  });

  it("never fewer than one a row", () => {
    expect(at(40, 2)).toMatchObject({ columns: 1, rows: 5 });
  });
});
