import { toStudentLoanPlanKey } from "@flump/finance-engine";
import {
  getMarginalRateExplorerDefaults,
  MarginalRateExplorer,
  type MarginalRateExplorerValues,
} from "@repo/ui";
import type { FC } from "react";
import { type ScenarioState, useScenarioState } from "~/hooks/useScenarioState";
import { nextPoundRoot } from "./NextPoundExplorer.styles";

/** Saved details the explorer starts from. Read only: nothing here writes back. */
export interface NextPoundSaved {
  /** Saved gross salary; 0 when none is saved (the explorer then uses its £39,000 example). */
  salary: number;
  taxRegion?: string | null;
  studentLoanPlans?: readonly string[] | null;
  /** Older single-plan profile field, used when `studentLoanPlans` is not answered. */
  studentLoanPlan?: string | null;
  isSalarySacrifice: boolean;
  /** Pension percent the page treats as saved. */
  pensionPercent: number;
  taxYear: string;
}

export type NextPoundScenario = ScenarioState<MarginalRateExplorerValues>;

const planString = (saved: NextPoundSaved): string => {
  const raw = saved.studentLoanPlans ?? (saved.studentLoanPlan ? [saved.studentLoanPlan] : []);
  const keys = new Set(
    raw.map((p) => toStudentLoanPlanKey(p)).filter((k): k is NonNullable<typeof k> => !!k),
  );
  return (["plan1", "plan2", "plan4", "plan5", "postgrad"] as const)
    .filter((k) => keys.has(k))
    .join("+");
};

/** Explorer values seeded from saved details. With no saved salary the example defaults stand. */
export function nextPoundSavedValues(saved: NextPoundSaved): MarginalRateExplorerValues {
  const defaults = getMarginalRateExplorerDefaults();
  const hasSalary = saved.salary > 0;
  return {
    ...defaults,
    grossPay: hasSalary ? saved.salary : defaults.grossPay,
    region: saved.taxRegion === "SCOTLAND" ? "SCOTLAND" : "ENGLAND_NI_WALES",
    studentLoans: planString(saved),
    pensionMethod: hasSalary ? (saved.isSalarySacrifice ? "salary-sacrifice" : "net-pay") : "none",
    pensionAmount: hasSalary ? Math.round((saved.salary * saved.pensionPercent) / 100) : 0,
    childBenefit: false,
    taxYear: saved.taxYear,
  };
}

/** In-memory what-if state for the explorer, seeded from saved details. Never saved anywhere. */
export function useNextPoundScenario(saved: NextPoundSaved): NextPoundScenario {
  // The values are all primitives, and useScenarioState compares them shallowly, so a fresh
  // object each render does not reseed the scenario.
  return useScenarioState(nextPoundSavedValues(saved));
}

export interface NextPoundExplorerProps {
  scenario: NextPoundScenario;
}

/** "The next £1,000" tool for the take-home ScenarioZone. */
export const NextPoundExplorer: FC<NextPoundExplorerProps> = ({ scenario }) => (
  <div className={nextPoundRoot()} data-testid="next-pound-explorer" id="next-pound-explorer">
    {/* Always inside a ScenarioZone or a page that shows the notice, so the panel leaves it out. */}
    <MarginalRateExplorer
      headingLevel="h3"
      showNotice={false}
      values={scenario.values}
      onChange={scenario.set}
    />
  </div>
);

export default NextPoundExplorer;
