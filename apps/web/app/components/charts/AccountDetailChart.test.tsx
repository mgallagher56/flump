import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import AccountDetailChart from "./AccountDetailChart";

vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: any }) => (
      <div style={{ width: 400, height: 200 }}>{children}</div>
    ),
  };
});

describe("<AccountDetailChart />", () => {
  test("exposes the balance history as a named figure with formatted start and end balances", () => {
    const { getByRole } = customRender(
      <AccountDetailChart
        accountDetails={[
          { month: 1, year: 2026, value: 12000 },
          { month: 2, year: 2026, value: 12345 },
        ]}
        title="Everyday account balance history"
      />,
    );

    const figure = getByRole("figure", { name: "Everyday account balance history" });
    expect(figure.textContent).toContain("£12,000");
    expect(figure.textContent).toContain("£12,345");
  });
});
