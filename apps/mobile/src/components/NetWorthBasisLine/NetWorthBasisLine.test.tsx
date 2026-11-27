import { fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { NetWorthBasisLine, type NetWorthBasisLineProps } from "./NetWorthBasisLine";
import { netWorthBasisLineStates } from "./NetWorthBasisLine.states";

async function line(
  props: Partial<NetWorthBasisLineProps> & Pick<NetWorthBasisLineProps, "leftOut">,
) {
  const onChangeWhatCounts = jest.fn();
  const onAddEstimate = jest.fn();
  await render(
    <ThemeProvider scheme="light">
      <NetWorthBasisLine
        onChangeWhatCounts={onChangeWhatCounts}
        onAddEstimate={onAddEstimate}
        {...props}
      />
    </ThemeProvider>,
  );
  return { onChangeWhatCounts, onAddEstimate };
}

describe("NetWorthBasisLine", () => {
  it.each([
    [["studentLoan"], "Not counting your student loan."],
    [["property", "mortgage"], "Not counting your property or mortgage."],
    [
      ["property", "mortgage", "studentLoan"],
      "Not counting your property, mortgage or student loan.",
    ],
  ] as const)(
    "%j: says what is left out, and Change what counts opens settings",
    async (leftOut, words) => {
      const { onChangeWhatCounts, onAddEstimate } = await line({ leftOut });
      expect(screen.getByText(words)).toBeOnTheScreen();
      await userEvent
        .setup()
        .press(screen.getByRole("link", { name: "Change what counts on the website" }));
      expect(onChangeWhatCounts).toHaveBeenCalledTimes(1);
      expect(onAddEstimate).not.toHaveBeenCalled();
    },
  );

  it("a missing home value asks for an estimate instead, one notice only", async () => {
    const { onAddEstimate } = await line({ leftOut: ["studentLoan", "homeValueMissing"] });
    expect(
      screen.getByText("Your home's value is not counted until you add an estimate."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/Not counting/)).toBeNull();
    await userEvent
      .setup()
      .press(screen.getByRole("link", { name: "Add an estimate on the website" }));
    expect(onAddEstimate).toHaveBeenCalledTimes(1);
  });

  it("nothing when nothing is left out", async () => {
    await line({ leftOut: [] });
    expect(screen.queryByTestId("net-worth-basis-line")).toBeNull();
  });

  it("says it opens the website's home page when it cannot open the page itself", async () => {
    await line({ leftOut: ["studentLoan"], websiteLabel: "Open the Flump website" });
    expect(screen.getByRole("link", { name: "Open the Flump website" })).toBeOnTheScreen();
  });

  it.each(Object.entries(netWorthBasisLineStates))(
    "%s holds at 200%% text",
    async (_name, props) => {
      await expectHoldsAtDoubleText(<NetWorthBasisLine {...props} />);
    },
  );

  it("the accounts list's line: the link alone when nothing is left out and a choice applies", async () => {
    const onChangeWhatCounts = jest.fn();
    const view = await render(
      <ThemeProvider scheme="light">
        <NetWorthBasisLine
          {...netWorthBasisLineStates.linkOnly}
          onChangeWhatCounts={onChangeWhatCounts}
        />
      </ThemeProvider>,
    );
    expect(screen.queryByText(/Not counting/)).toBeNull();
    fireEvent.press(screen.getByRole("link", { name: "Change what counts on the website" }));
    expect(onChangeWhatCounts).toHaveBeenCalledTimes(1);
    await view.rerender(
      <ThemeProvider scheme="light">
        <NetWorthBasisLine {...netWorthBasisLineStates.linkOnly} choicesAvailable={false} />
      </ThemeProvider>,
    );
    expect(screen.queryByTestId("net-worth-basis-line")).toBeNull();
  });
});
