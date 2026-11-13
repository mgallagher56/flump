import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import DebtToWealthBridgeCard from "./DebtToWealthBridgeCard";

vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

const card = { id: "d1", name: "Card", balance: 3000, apr: 19.9, minimumPayment: 100 };

describe("<DebtToWealthBridgeCard />", () => {
  test("frames the projection as a neutral what-if with the rate as an assumption", () => {
    const { container } = customRender(
      <DebtToWealthBridgeCard debts={[card]} extraPayment={100} />,
    );
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "What if the money that clears your debts went into savings instead?",
      }),
    ).toBeDefined();
    expect(container.textContent).toContain("Assumes 4.5% a year (Cash ISA)");
    expect(container.textContent).toContain("Projection, not a forecast.");
    expect(container.textContent).not.toMatch(/breakthrough|exponential|tax-sheltered/i);
  });

  test("exposes the crossover chart as a named figure with the formatted wealth headline", () => {
    const { getByRole } = customRender(
      <DebtToWealthBridgeCard debts={[card]} extraPayment={100} />,
    );
    const figure = getByRole("figure", { name: "Debt-to-wealth crossover" });
    expect(figure.textContent).toMatch(/Debt-free after \d+ months/);
    expect(figure.textContent).toMatch(/£[\d,]+ is accumulated in an ISA/);
  });

  test("changing the labelled growth rate updates the stated assumption", () => {
    const { container } = customRender(
      <DebtToWealthBridgeCard debts={[card]} extraPayment={100} />,
    );
    fireEvent.change(screen.getByLabelText("Assumed growth a year"), { target: { value: "6" } });
    expect(container.textContent).toContain("Assumes 6.0% a year (Balanced stocks and shares ISA)");
  });

  test("uses neutral copy and Not set when the debt is not cleared within the projection", () => {
    const stuck = { id: "d1", name: "Card", balance: 5000, apr: 40, minimumPayment: 1 };
    const { getByRole, container } = customRender(
      <DebtToWealthBridgeCard debts={[stuck]} extraPayment={0} />,
    );
    const figure = getByRole("figure", { name: "Debt-to-wealth crossover" });
    expect(figure.textContent).not.toMatch(/Debt-free after/);
    expect(figure.textContent).toMatch(/Debt is not cleared within the projection/);
    expect(container.textContent).toContain("Not set");
  });
});
