import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import DebtToWealthBridgeCard from "./DebtToWealthBridgeCard";

vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: any }) => (
      <div style={{ width: 400, height: 400 }}>{children}</div>
    ),
  };
});

describe("<DebtToWealthBridgeCard />", () => {
  test("exposes the crossover chart as a named figure with the formatted wealth headline", () => {
    const { getByRole } = customRender(
      <DebtToWealthBridgeCard
        debts={[
          {
            id: "d1",
            name: "Card",
            balance: 3000,
            apr: 19.9,
            minimumPayment: 100,
          },
        ]}
        extraPayment={100}
      />,
    );

    const figure = getByRole("figure", { name: "Debt-to-wealth crossover" });
    expect(figure.textContent).toMatch(/Debt-free after \d+ months/);
    expect(figure.textContent).toMatch(/£[\d,]+ is accumulated in an ISA/);
  });
});
