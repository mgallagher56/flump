import type { ProfileFacts } from "@flump/finance-engine";
import { DELTA_PANEL_COPY } from "@repo/ui";
import { expectPageRules } from "@repo/ui/testing";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { type FC, useMemo, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { projectPension } from "../../forecast";
import { usePensionScenario } from "../../usePensionScenario";
import {
  buildForecastInput,
  PensionForecast,
  type PensionForecastBase,
  type PensionTool,
} from "./PensionForecast";

vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (v: number) => `£${Math.round(v).toLocaleString("en-GB")}`,
  }),
}));
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

const base: PensionForecastBase = {
  salary: 58000,
  employerPercent: 3,
  isSalarySacrifice: false,
  passEmployerNi: false,
  currentPotTotal: 96000,
  directMonthlyContrib: 0,
};

const FACTS: ProfileFacts = {
  annualSalary: 58000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 8,
  isSalarySacrifice: false,
};

const Harness: FC<{
  hasSalary?: boolean;
  takeHome?: boolean;
  age?: number | null;
  otherTax?: boolean;
}> = ({ hasSalary = true, takeHome = true, age = 35, otherTax = false }) => {
  const scenario = usePensionScenario({ contributionPercent: 8, horizonYears: 32, growthRate: 5 });
  const [tool, setTool] = useState<PensionTool>("retirement");
  const savedResult = useMemo(
    () => projectPension(buildForecastInput(base, scenario.saved)),
    [scenario.saved],
  );
  return (
    <PensionForecast
      {...base}
      currentAge={age}
      hasSalary={hasSalary}
      savedEmployeePercent={8}
      savedResult={savedResult}
      scenario={scenario}
      showsOtherTaxFigure={otherTax}
      takeHomeFacts={takeHome ? FACTS : undefined}
      tool={tool}
      onToolChange={setTool}
    />
  );
};

const zone = () => screen.getByRole("region", { name: "Model a change to your pension" });
const visiblePanel = () => screen.getByRole("tabpanel");

describe("<PensionForecast />", () => {
  it("has one footer action, the reset, and no link away from the zone", () => {
    render(<Harness />);
    const footerButtons = () =>
      within(zone())
        .queryAllByRole("button", { name: "Reset to saved figures" })
        .map((b) => b.textContent);
    expect(footerButtons()).toEqual([]);
    fireEvent.change(within(visiblePanel()).getByLabelText("Your contribution"), {
      target: { value: "12" },
    });
    const footer = within(zone()).getByTestId("scenario-zone-footer");
    expect(
      within(footer)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Reset to saved figures"]);
  });

  it("is one zone with two tools as tabs, one visible, at most three inputs and one notice", () => {
    render(<Harness />);
    expect(within(zone()).getByText("Illustration, not saved")).toBeDefined();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "At retirement",
      "Take-home pay",
    ]);
    expect(within(visiblePanel()).getAllByRole("slider")).toHaveLength(3);
    expect(zone().querySelectorAll("[data-notice='projection']")).toHaveLength(1);
    expect(zone().querySelectorAll("[data-tone='hero']")).toHaveLength(0);
    // One outcome, two supporting figures, two slider values; the chart adds none.
    expectPageRules(zone(), { maxFigures: 5, projectionNotices: 1 });
  });

  it("hides the tabs when only the retirement tool is available", () => {
    render(<Harness takeHome={false} />);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getAllByRole("slider")).toHaveLength(3);
  });

  it("moving an input enables Reset, and Reset restores the saved figures", () => {
    render(<Harness />);
    expect(screen.queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
    // The change line appears only once an input moves.
    expect(screen.queryByText("Change in monthly income")).toBeNull();
    fireEvent.change(within(visiblePanel()).getByLabelText("Your contribution"), {
      target: { value: "12" },
    });
    expect(screen.getByText("Change in monthly income")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect(screen.queryByText("Change in monthly income")).toBeNull();
  });

  it("the take-home tool reads the same contribution and adds the unverified lead to the notice", () => {
    render(<Harness />);
    fireEvent.change(within(visiblePanel()).getByLabelText("Your contribution"), {
      target: { value: "10" },
    });
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Take-home pay" }), {
      button: 0,
    });
    expect(within(visiblePanel()).getAllByRole("slider")).toHaveLength(1);
    expect(screen.getByText("Change in take-home pay")).toBeDefined();
    const notice = zone().querySelector("[data-notice='projection']");
    expect(notice?.textContent).toContain(DELTA_PANEL_COPY.unverifiedBanner);
  });

  it("no salary shows the prompt and no projection", () => {
    render(<Harness hasSalary={false} />);
    expect(screen.getByText(/to see a pension estimate/)).toBeDefined();
    expect(screen.queryByRole("slider")).toBeNull();
  });

  it("announces an 'Illustration:' outcome only after an input moves", () => {
    vi.useFakeTimers();
    try {
      render(<Harness takeHome={false} />);
      const region = within(zone()).getByRole("status");
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(region.textContent).toBe("");
      fireEvent.change(screen.getByLabelText("Retirement age"), {
        target: { value: "60" },
      });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(region.textContent).toMatch(/^Illustration: estimated pot about £[\d,]+ at 60/);
    } finally {
      vi.useRealTimers();
    }
  });
});
