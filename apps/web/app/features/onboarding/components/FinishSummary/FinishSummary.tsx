import { Button, Heading, Icon, KpiCard, ProjectionNotice, StatusBadge } from "@repo/ui";
import { ArrowLeft, Info, TriangleAlert } from "lucide-react";
import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { AppPageKey } from "~/utils/pageConfig";
import { REGION_ASSUMPTION_LABEL } from "~/utils/taxTrapCopy";
import { birthYearFromAge } from "../../age";
import type { OnboardingSummary } from "../../deriveOnboardingSummary";
import { MODULE_LABELS } from "../../inferModules";
import { type OnboardingValues, STEP_LABELS } from "../../types";
import type { FinishSaveState } from "../../useFinishOnboarding";
import { finishSummaryRecipe } from "./FinishSummary.styles";

export interface FinishSummaryProps {
  values: OnboardingValues;
  summary: OnboardingSummary;
  modules: AppPageKey[];
  isSubmitting: boolean;
  onFinish: () => void;
  onBack: () => void;
  /** Jump to a step (counting from 1) to add or change something. */
  onEdit: (step: number) => void;
  /**
   * "Go to You and income" when something Finish needs is missing. Defaults to `onEdit(1)`; the
   * flow passes a handler that also marks the missing fields.
   */
  onFixMissing?: () => void;
  /** The last Finish error, repeated beside the Finish button. */
  error?: string | null;
  /** What the account holds after the last attempt; drives the saved note. */
  saveState?: FinishSaveState;
}

const NOT_SET = "Not set";
const REGIONS: Record<string, string> = {
  ENGLAND: "England",
  WALES: "Wales",
  SCOTLAND: "Scotland",
  NORTHERN_IRELAND: "Northern Ireland",
};
const HOUSING: Record<OnboardingValues["housingStatus"], string> = {
  renting: "Renting",
  mortgage: "Mortgage",
  own_outright: "Own outright",
};
const EMPLOYMENT: Record<OnboardingValues["employmentType"], string> = {
  employed: "Employed",
  "self-employed": "Self-employed",
};
const STUDENT_LOANS: Record<string, string> = {
  NONE: "None",
  PLAN_1: "Plan 1",
  PLAN_2: "Plan 2",
  PLAN_4: "Plan 4 (Scotland)",
  PLAN_5: "Plan 5",
  POSTGRAD: "Postgraduate Loan",
};
const NOT_APPLICABLE = "Not applicable";
const percent = new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 });

export const SAVED_NOTES: Record<FinishSaveState, string> = {
  idle: "Held in this browser tab until you finish. Nothing is saved to your account yet.",
  partial: "Some details are saved. Finish again to add the rest.",
  unconfirmed:
    "Held in this browser tab. We could not confirm anything was saved, so finish again to save your details.",
};

export const FinishSummary: FC<FinishSummaryProps> = ({
  values,
  summary,
  modules,
  isSubmitting,
  onFinish,
  onBack,
  onEdit,
  onFixMissing,
  error = null,
  saveState = "idle",
}) => {
  const classes = finishSummaryRecipe();
  const { formatCurrency } = useFormatCurrency();
  // Only a gross salary is taxed by region; a typed take-home needs no assumption.
  const assumingRegion = values.taxRegion === null && values.incomeMode === "gross";
  const money = (v: number | null, suffix = "") =>
    v === null ? NOT_SET : `${formatCurrency(v)}${suffix}`;

  const groups: { step: number; title: string; rows: [string, string][] }[] = [
    {
      step: 1,
      title: STEP_LABELS.income,
      rows: [
        [
          values.incomeMode === "gross" ? "Annual gross salary" : "Monthly take-home pay",
          money(values.incomeMode === "gross" ? values.grossSalary : values.monthlyTakeHome),
        ],
        ["How you earn", EMPLOYMENT[values.employmentType] ?? NOT_SET],
        [
          "Where you pay tax",
          values.taxRegion ? (REGIONS[values.taxRegion] ?? values.taxRegion) : NOT_SET,
        ],
        // An age that cannot be saved is shown as Not set, matching what Finish stores.
        ["Age", birthYearFromAge(values.age) === undefined ? NOT_SET : String(values.age)],
        [
          "Student loan plan",
          values.studentLoanPlan
            ? (STUDENT_LOANS[values.studentLoanPlan] ?? values.studentLoanPlan)
            : NOT_SET,
        ],
      ],
    },
    {
      step: 2,
      title: STEP_LABELS.housing,
      rows: [
        ["Housing", HOUSING[values.housingStatus]],
        [
          values.housingStatus === "mortgage" ? "Monthly mortgage payment" : "Monthly rent",
          values.housingStatus === "own_outright"
            ? NOT_APPLICABLE
            : money(values.monthlyHousingCost, "/mo"),
        ],
        [
          "Property value",
          values.housingStatus === "renting" ? NOT_APPLICABLE : money(values.propertyValue),
        ],
        [
          "Mortgage balance",
          values.housingStatus === "mortgage" ? money(values.mortgageBalance) : NOT_APPLICABLE,
        ],
        ["Other monthly outgoings", money(values.monthlyOtherOutgoings, "/mo")],
      ],
    },
    {
      step: 3,
      title: STEP_LABELS.savings,
      rows: [
        ["Cash and ISA savings", money(values.cashSavings)],
        ["Pension pot", money(values.pensionPot)],
        [
          "Pension contribution",
          values.pensionPercent === null ? NOT_SET : percent.format(values.pensionPercent / 100),
        ],
        ["Unsecured debt", money(values.unsecuredDebt)],
      ],
    },
  ];

  return (
    <div
      className={classes.root}
      data-testid="onboarding-finish-summary"
      id="onboarding-finish-summary"
    >
      <Heading as="h2" id="onboarding-review-title" size="md" tabIndex={-1}>
        Review what will be saved
      </Heading>

      <KpiCard
        label="Net take-home"
        subtext={
          assumingRegion
            ? `per month, estimated from what you entered. ${REGION_ASSUMPTION_LABEL}`
            : "per month, estimated from what you entered"
        }
        tone="hero"
        value={summary.hasIncome ? summary.monthlyTakeHome : null}
      />

      <div className={classes.group}>
        <h3 className={classes.groupTitle}>Your starting picture</h3>
        <dl className={classes.rows}>
          <div className={classes.row}>
            <dt className={classes.rowLabel}>Monthly surplus</dt>
            <dd className={classes.rowValue}>
              {summary.hasIncome
                ? `${summary.monthlySurplus >= 0 ? "+" : ""}${formatCurrency(summary.monthlySurplus)}/mo`
                : NOT_SET}
            </dd>
          </div>
          <div className={classes.row}>
            <dt className={classes.rowLabel}>Starting net worth</dt>
            <dd className={classes.rowValue}>
              {summary.hasNetWorthInputs ? formatCurrency(summary.startingNetWorth) : NOT_SET}
            </dd>
          </div>
        </dl>
      </div>

      {groups.map((group) => (
        <div className={classes.group} key={group.step}>
          <div className={classes.groupHead}>
            <h3 className={classes.groupTitle}>{group.title}</h3>
            <Button
              aria-label={`Edit ${group.title}`}
              onClick={() => onEdit(group.step)}
              size="sm"
              type="button"
              variant="ghost"
            >
              Edit
            </Button>
          </div>
          <dl className={classes.rows}>
            {group.rows.map(([label, value]) => (
              <div className={classes.row} key={label}>
                <dt className={classes.rowLabel}>{label}</dt>
                <dd className={classes.rowValue}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      <div className={classes.group}>
        <h3 className={classes.groupTitle}>Modules switched on</h3>
        <ul aria-label="Modules switched on" className={classes.modules}>
          {modules.map((key) => (
            <li key={key}>
              <StatusBadge variant="neutral">{MODULE_LABELS[key] ?? key}</StatusBadge>
            </li>
          ))}
        </ul>
      </div>

      {summary.missingForFinish ? (
        <div
          className={classes.missing}
          data-testid="finish-income-hint"
          id="finish-income-hint"
          role="status"
        >
          <span>
            <Icon icon={TriangleAlert} size="sm" /> {summary.missingForFinish} to finish setup.
          </span>
          <Button
            onClick={onFixMissing ?? (() => onEdit(1))}
            size="sm"
            type="button"
            variant="outline"
          >
            Go to You and income
          </Button>
        </div>
      ) : null}

      <p className={classes.saved} data-testid="onboarding-saved-note" id="onboarding-saved-note">
        <span className={classes.savedIcon}>
          <Icon icon={Info} size="sm" />
        </span>
        <span>{SAVED_NOTES[saveState]}</span>
      </p>

      <ProjectionNotice />

      {error ? (
        <p
          className={classes.error}
          data-testid="onboarding-finish-error"
          id="onboarding-finish-error"
          role="alert"
        >
          <span className={classes.savedIcon}>
            <Icon icon={TriangleAlert} size="sm" />
          </span>
          <span>{error}</span>
        </p>
      ) : null}

      <div className={classes.actions}>
        <Button onClick={onBack} size="sm" type="button" variant="ghost">
          <Icon icon={ArrowLeft} size="sm" /> Back
        </Button>
        <Button
          aria-describedby={[
            error ? "onboarding-finish-error" : null,
            summary.canFinish ? "onboarding-saved-note" : "finish-income-hint",
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={!summary.canFinish}
          onClick={onFinish}
          pending={isSubmitting}
          type="button"
        >
          {isSubmitting ? "Saving..." : "Finish and open dashboard"}
        </Button>
      </div>
    </div>
  );
};
