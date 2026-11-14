import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import AccountDetailChart, { accountChartSummary, accountSourceLabel } from "./AccountDetailChart";

vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: any }) => (
      <div style={{ width: 400, height: 200 }}>{children}</div>
    ),
  };
});

const gbp = (v: number) => `£${v.toLocaleString("en-GB")}`;

describe("<AccountDetailChart />", () => {
  test("shows a visible summary with the takeaway, and the source of each month in Show data", async () => {
    const { getByRole, getByText, user } = customRender(
      <AccountDetailChart
        accountDetails={[
          { month: 5, year: 2026, value: 12000 },
          { month: 6, year: 2026, value: 12345, source: "calculated" },
          { month: 7, year: 2026, value: 12345, source: "confirmed" },
          { month: 8, year: 2026, value: 13000, carried: true },
        ]}
        title="Everyday account balance history"
      />,
    );

    const figure = getByRole("figure", { name: "Everyday account balance history" });
    expect(figure).toBeDefined();
    expect(
      getByText(
        "Up £1,000 since May 2026. The dashed end is this month's saved balance, not yet recorded.",
      ),
    ).toBeDefined();
    await user.click(getByRole("button", { name: "Show data" }));
    const table = getByRole("table", { name: "Everyday account balance history by month" });
    expect(table.textContent).toContain("Calculated");
    expect(table.textContent).toContain("Confirmed");
    expect(table.textContent).toContain("Saved balance");
    expect(table.textContent).toContain("£12,345");
  });

  test("shows a prompt instead of a line with one month", () => {
    const { getByText } = customRender(
      <AccountDetailChart accountDetails={[{ month: 5, year: 2026, value: 12000 }]} />,
    );
    expect(
      getByText("The chart appears once this account has more monthly balances."),
    ).toBeDefined();
  });
});

describe("accountChartSummary", () => {
  test("words the change the same up or down, and names the dashed end only when it applies", () => {
    const rows = [
      { month: 5, year: 2026, value: 900 },
      { month: 11, year: 2026, value: 600 },
    ];
    expect(accountChartSummary(rows, gbp)).toBe("Down £300 since May 2026.");
  });
});

describe("accountSourceLabel", () => {
  test("names each source", () => {
    expect(accountSourceLabel({ month: 1, year: 2026, value: 1, source: "calculated" })).toBe(
      "Calculated",
    );
    expect(accountSourceLabel({ month: 1, year: 2026, value: 1, source: "confirmed" })).toBe(
      "Confirmed",
    );
    expect(accountSourceLabel({ month: 1, year: 2026, value: 1 })).toBe("Recorded");
    expect(accountSourceLabel({ month: 1, year: 2026, value: 1, carried: true })).toBe(
      "Saved balance",
    );
  });
});
