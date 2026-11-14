import { Button, Heading, Icon, KpiCard, ProjectionNotice, StatusBadge } from "@repo/ui";
import { ArrowLeft, Info, TriangleAlert } from "lucide-react";
import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { AppPageKey } from "~/utils/pageConfig";
import { REGION_ASSUMPTION_LABEL } from "~/utils/taxTrapCopy";
import { birthYearFromAge } from "../../age";
import type { OnboardingSummary } from "../../deriveOnboardingSummary";
import { MODULE_LABELS } from "../../inferModules";
import { type HousingStatus, type OnboardingValues, ownsHome, STEP_LABELS } from "../../types";
import type { FinishSaveState } from "../../useFinishOnboarding";
import { TAKE_HOME_LABEL } from "../LiveSummaryBar";
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
   * "Edit you and income" when something Finish needs is missing. Defaults to `onEdit(1)`; the
   * flow passes a handler that also marks the missing fields.
   */
  onFixMissing?: () => void;
  /** The last Finish error, repeated beside the Finish button. */
  error?: string | null;
  /** What the account holds after the last attempt; drives the saved note. */
  saveState?: FinishSaveState;
}

const REGIONS: Record<string, string> = {
  ENGLAND: "England",
  WALES: "Wales",
  SCOTLAND: "Scotland",
  NORTHERN_IRELAND: "Northern Ireland",
};
const HOUSING: Record<HousingStatus, string> = {
  renting: "Renting",
  mortgage: "Paying a mortgage",
  own_outright: "Own with no mortgage",
  living_with_family: "Living with family or friends",
};
/** The monthly housing amount's label per answer. Own with no mortgage has no such row. */
const HOUSING_COST_LABEL: Partial<Record<HousingStatus, string>> = {
  renting: "Monthly rent",
  mortgage: "Monthly mortgage payment",
  living_with_family: "What you pay each month",
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
  POSTGRAD: "Postgraduate loan",
};
const percent = new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 });

export const SECTIONS_TITLE = "Sections we have set up for you";
export const NOTHING_ADDED = "Nothing added yet.";

export const SAVED_NOTES: Record<FinishSaveState, string> = {
  idle: "Held in this browser tab until you finish. Nothing is saved to your account yet.",
  partial:
    'Some of your details are saved. Select "Finish and open dashboard" again to save the rest.',
  unconfirmed:
    'We could not confirm your details were saved. They are still in this browser tab. Select "Finish and open dashboard" again.',
};

type Row = [label: string, value: string];

/** Only the rows the person actually entered: no "Not set" or "Not applicable" rows. */
const entered = (rows: Array<Row | null>): Row[] => rows.filter((row): row is Row => row !== null);

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
  const money = (label: string, v: number | null): Row | null =>
    v === null ? null : [label, formatCurrency(v)];
  const monthly = (label: string, v: number | null): Row | null =>
    v === null ? null : [label, `${formatCurrency(v)} a month`];
  const status = values.housingStatus;
  const housingCostLabel = status ? HOUSING_COST_LABEL[status] : undefined;

  const groups: { step: number; title: string; rows: Row[] }[] = [
    {
      step: 1,
      title: STEP_LABELS.income,
      rows: entered([
        values.incomeMode === "gross"
          ? money("Yearly salary before tax", values.grossSalary)
          : monthly("Monthly take-home pay", values.monthlyTakeHome),
        ["How you earn", EMPLOYMENT[values.employmentType]],
        values.taxRegion
          ? ["Where you pay tax", REGIONS[values.taxRegion] ?? values.taxRegion]
          : null,
        // An age that cannot be saved is left out, matching what Finish stores.
        birthYearFromAge(values.age) === undefined ? null : ["Age", String(values.age)],
        ["Student loan plan", STUDENT_LOANS[values.studentLoanPlan] ?? values.studentLoanPlan],
      ]),
    },
    {
      step: 2,
      title: STEP_LABELS.housing,
      rows: entered([
        status ? ["Housing", HOUSING[status]] : null,
        housingCostLabel ? monthly(housingCostLabel, values.monthlyHousingCost) : null,
        ownsHome(status) ? money("What your home is worth", values.propertyValue) : null,
        status === "mortgage" ? money("Mortgage left to pay", values.mortgageBalance) : null,
        monthly("Other monthly spending", values.monthlyOtherOutgoings),
      ]),
    },
    {
      step: 3,
      title: STEP_LABELS.savings,
      rows: entered([
        money("Cash and ISA savings", values.cashSavings),
        money("Pension pot", values.pensionPot),
        values.pensionPercent === null
          ? null
          : ["Pension contribution", percent.format(values.pensionPercent / 100)],
        money("Owed on credit cards and loans", values.unsecuredDebt),
      ]),
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

      {/* An estimate, so never in the hero style (D2): the default card, labelled as an estimate. */}
      <KpiCard
        label={TAKE_HOME_LABEL}
        subtext={
          assumingRegion
            ? `Worked out from what you entered. ${REGION_ASSUMPTION_LABEL}`
            : "Worked out from what you entered"
        }
        value={summary.hasIncome ? summary.monthlyTakeHome : null}
      />

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
          {group.rows.length > 0 ? (
            <dl className={classes.rows}>
              {group.rows.map(([label, value]) => (
                <div className={classes.row} key={label}>
                  <dt className={classes.rowLabel}>{label}</dt>
                  <dd className={classes.rowValue}>{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className={classes.empty}>{NOTHING_ADDED}</p>
          )}
        </div>
      ))}

      <div className={classes.group}>
        <h3 className={classes.groupTitle}>{SECTIONS_TITLE}</h3>
        <ul aria-label={SECTIONS_TITLE} className={classes.modules}>
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
            <Icon icon={TriangleAlert} size="sm" /> {summary.missingForFinish} to finish setting up.
          </span>
          <Button
            onClick={onFixMissing ?? (() => onEdit(1))}
            size="sm"
            type="button"
            variant="outline"
          >
            Edit you and income
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
          {isSubmitting ? "Saving…" : "Finish and open dashboard"}
        </Button>
      </div>
    </div>
  );
};
