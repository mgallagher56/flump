import { render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { EngineCheck } from "./EngineCheck";
import type { CheckReport } from "./runChecks";

const passing: CheckReport = {
  jsEngine: "Hermes",
  vectors: { checked: 120, failedIds: [] },
  formatting: { checked: 40, mismatches: [] },
  apiAddress: "http://localhost:3000",
};

const renderWith = (report: CheckReport) =>
  render(
    <ThemeProvider scheme="dark">
      <EngineCheck report={report} />
    </ThemeProvider>,
  );

describe("EngineCheck", () => {
  it("says everything passes when nothing failed", async () => {
    await renderWith(passing);
    expect(screen.getByRole("header", { name: "Device check" })).toBeOnTheScreen();
    expect(screen.getByText("Hermes")).toBeOnTheScreen();
    expect(screen.getByText("All vectors pass (120 checked)")).toBeOnTheScreen();
    expect(screen.getByText("All formatting cases match (40 checked)")).toBeOnTheScreen();
    expect(screen.getByText("http://localhost:3000")).toBeOnTheScreen();
  });

  it("names each failing vector and formatting case instead of saying all pass", async () => {
    await renderWith({
      ...passing,
      vectors: { checked: 120, failedIds: ["ewni.incomeTax.2025-26.50000"] },
      formatting: {
        checked: 40,
        mismatches: [{ call: "formatCurrency([1234])", expected: "£1,234", actual: "£1234" }],
      },
    });
    expect(screen.queryByText(/All vectors pass/)).toBeNull();
    expect(screen.getByText("1 of 120 vectors fail")).toBeOnTheScreen();
    expect(screen.getByText("ewni.incomeTax.2025-26.50000")).toBeOnTheScreen();
    expect(screen.getByText("1 of 40 formatting cases differ")).toBeOnTheScreen();
    expect(
      screen.getByText("formatCurrency([1234]): expected £1,234, got £1234"),
    ).toBeOnTheScreen();
  });

  it("runs the checks itself when no report is given", async () => {
    await render(
      <ThemeProvider scheme="light">
        <EngineCheck />
      </ThemeProvider>,
    );
    expect(screen.getByText(/^All vectors pass \(\d+ checked\)$/)).toBeOnTheScreen();
  });
});
