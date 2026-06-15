import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaCheckCircle, FaRegCircle } from "react-icons/fa";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import type { BudgetEntry } from "~/types/budget";
import { CATEGORY_ICONS, toMonthly } from "~/types/budget";

interface BudgetSetupWizardProps {
  entries: BudgetEntry[];
  onUpdateEntry: (id: string, update: Partial<BudgetEntry>) => Promise<void>;
  onAddEntry?: (
    entry: Omit<BudgetEntry, "id" | "userId" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  onComplete: () => void;
  onCancel: () => void;
  /** Pre-filled monthly take-home from user profile */
  monthlyTakeHome: number | null;
}

type WizardStep = "welcome" | "income" | "housing" | "bills" | "expenses" | "savings" | "summary";
const STEPS: WizardStep[] = [
  "welcome",
  "income",
  "housing",
  "bills",
  "expenses",
  "savings",
  "summary",
];

const STEP_LABELS: Record<WizardStep, string> = {
  welcome: "Welcome",
  income: "Income",
  housing: "Housing",
  bills: "Bills",
  expenses: "Expenses",
  savings: "Savings",
  summary: "Summary",
};

const STEP_DESCRIPTIONS: Record<WizardStep, string> = {
  welcome:
    "Set up your monthly budget to understand where your money goes and how long your runway is.",
  income: "Enter your take-home pay and any other income sources.",
  housing: "Rent, mortgage, insurance — your home costs.",
  bills: "Gas, electricity, water, council tax, broadband.",
  expenses: "Subscriptions, phone, gym, insurance, etc.",
  savings: "How much do you want to save each month?",
  summary: "Review your budget before finishing.",
};

const inputStyle = css({
  width: "100%",
  padding: "10px 14px",
  fontSize: "sm",
  borderRadius: "sm",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "transparent",
  color: "text.primary",
  outline: "none",
  transition: "all 0.2s",
  _focus: {
    borderColor: "primary",
    boxShadow: "0 0 0 1px token(colors.primary)",
  },
});

interface EntryRowProps {
  entry: BudgetEntry;
  onUpdate: (id: string, update: Partial<BudgetEntry>) => void;
}

const EntryRow: FC<EntryRowProps> = ({ entry, onUpdate }) => (
  <div
    className={css({
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: "12px",
      alignItems: "center",
      padding: "10px 0",
      borderBottom: "1px solid",
      borderColor: "border",
    })}
  >
    <div>
      <FLPText fontSize="sm" fontWeight="medium">
        {entry.name}
      </FLPText>
      {!entry.isEssential && (
        <FLPText color="text.muted" fontSize="xs">
          discretionary
        </FLPText>
      )}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ color: "var(--colors-text-muted)", fontSize: "14px" }}>£</span>
      <input
        className={inputStyle}
        min="0"
        step="1"
        style={{ width: "100px", textAlign: "right" }}
        type="number"
        value={entry.amount}
        onChange={(e) => onUpdate(entry.id, { amount: Number(e.target.value) })}
      />
      <FLPText color="text.muted" fontSize="xs" style={{ width: "28px" }}>
        /mo
      </FLPText>
    </div>
  </div>
);

const BudgetSetupWizard: FC<BudgetSetupWizardProps> = ({
  entries,
  onUpdateEntry,
  onComplete,
  onCancel,
  monthlyTakeHome,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>("welcome");
  const [localUpdates, setLocalUpdates] = useState<Record<string, Partial<BudgetEntry>>>({});
  const [saving, setSaving] = useState(false);

  const stepIndex = STEPS.indexOf(currentStep);
  const isFirst = stepIndex === 0;
  const isLast = currentStep === "summary";

  const localUpdate = (id: string, update: Partial<BudgetEntry>) => {
    setLocalUpdates((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...update } }));
  };

  const getEffectiveEntry = (entry: BudgetEntry): BudgetEntry => ({
    ...entry,
    ...(localUpdates[entry.id] ?? {}),
  });

  const getCategoryEntries = (cat: BudgetEntry["category"]) =>
    entries.filter((e) => e.category === cat).map(getEffectiveEntry);

  const saveAllAndProceed = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(localUpdates).map(([id, update]) => onUpdateEntry(id, update)),
      );
      setLocalUpdates({});
      const next = STEPS[stepIndex + 1];
      if (next) setCurrentStep(next);
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setCurrentStep(prev);
  };

  // Compute summary totals
  const allEffective = entries.map(getEffectiveEntry);
  const totalIncome = allEffective.filter((e) => e.isIncome).reduce((s, e) => s + toMonthly(e), 0);
  const totalExpenses = allEffective
    .filter((e) => !e.isIncome)
    .reduce((s, e) => s + toMonthly(e), 0);
  const surplus = totalIncome - totalExpenses;

  const fmt = (n: number) =>
    `£${Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // Progress bar
  const progressPct = (stepIndex / (STEPS.length - 1)) * 100;

  return (
    <div
      className={css({
        maxWidth: "640px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "0",
        borderRadius: "xl",
        border: "1px solid",
        borderColor: "border",
        overflow: "hidden",
        backgroundColor: "surface",
        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
      })}
    >
      {/* Progress bar */}
      <div
        className={css({
          height: "4px",
          backgroundColor: "background",
        })}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPct}%`,
            backgroundColor: "#6363f1",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* Step indicators */}
      <div
        className={css({
          display: "flex",
          gap: "0",
          backgroundColor: "background",
          borderBottom: "1px solid",
          borderColor: "border",
          overflowX: "auto",
        })}
      >
        {STEPS.filter((s) => s !== "welcome").map((step, i) => {
          const actualIndex = i + 1;
          const isDone = stepIndex > actualIndex;
          const isCurrent = currentStep === step;
          return (
            <div
              key={step}
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 14px",
                fontSize: "xs",
                fontWeight: "semibold",
                color: isCurrent ? "primary" : isDone ? "success.500" : "text.muted",
                borderBottom: isCurrent ? "2px solid" : "2px solid transparent",
                borderBottomColor: isCurrent ? "primary" : "transparent",
                flexShrink: 0,
              })}
            >
              {isDone ? (
                <FaCheckCircle style={{ fontSize: "12px" }} />
              ) : (
                <FaRegCircle style={{ fontSize: "12px" }} />
              )}
              {CATEGORY_ICONS[step as BudgetEntry["category"]] ?? ""} {STEP_LABELS[step]}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div
        className={css({ padding: "32px", display: "flex", flexDirection: "column", gap: "24px" })}
      >
        <div>
          <FLPHeading as="h2" size="lg" style={{ marginBottom: "6px" }}>
            {currentStep === "welcome"
              ? "Welcome to Budget Setup"
              : `${CATEGORY_ICONS[currentStep as BudgetEntry["category"]] ?? "📋"} ${STEP_LABELS[currentStep]}`}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm">
            {STEP_DESCRIPTIONS[currentStep]}
          </FLPText>
        </div>

        {/* Step content */}
        {currentStep === "welcome" && (
          <div
            className={css({
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              padding: "20px",
              borderRadius: "lg",
              backgroundColor: "rgba(99, 99, 241, 0.05)",
              border: "1px solid rgba(99, 99, 241, 0.2)",
            })}
          >
            {[
              "Enter your income and all monthly expenses",
              "Review pre-populated defaults — edit them to match your situation",
              "Get an instant surplus/deficit snapshot",
              "Unlock the Runway calculator to see how long you'd last if you lost your job",
            ].map((point) => (
              <div key={point} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <FaCheckCircle style={{ color: "#6363f1", marginTop: "2px", flexShrink: 0 }} />
                <FLPText fontSize="sm">{point}</FLPText>
              </div>
            ))}
          </div>
        )}

        {currentStep === "income" && (
          <div className={css({ display: "flex", flexDirection: "column", gap: "4px" })}>
            {monthlyTakeHome && (
              <div
                className={css({
                  padding: "12px",
                  borderRadius: "md",
                  backgroundColor: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  marginBottom: "8px",
                })}
              >
                <FLPText fontSize="xs" color="success.500">
                  💡 Your profile has a monthly take-home of <strong>{fmt(monthlyTakeHome)}</strong>
                  . Update the salary entry below to match.
                </FLPText>
              </div>
            )}
            {getCategoryEntries("income").map((e) => (
              <EntryRow key={e.id} entry={e} onUpdate={localUpdate} />
            ))}
          </div>
        )}

        {(currentStep === "housing" ||
          currentStep === "bills" ||
          currentStep === "expenses" ||
          currentStep === "savings") && (
          <div className={css({ display: "flex", flexDirection: "column", gap: "4px" })}>
            {getCategoryEntries(currentStep).map((e) => (
              <EntryRow key={e.id} entry={e} onUpdate={localUpdate} />
            ))}
          </div>
        )}

        {currentStep === "summary" && (
          <div className={css({ display: "flex", flexDirection: "column", gap: "12px" })}>
            {[
              { label: "Total Income", value: fmt(totalIncome), colour: "#10b981" },
              { label: "Total Expenses", value: fmt(totalExpenses), colour: "#ef4444" },
              {
                label: surplus >= 0 ? "Monthly Surplus" : "Monthly Deficit",
                value: `${surplus >= 0 ? "+" : "-"}${fmt(surplus)}`,
                colour: surplus >= 0 ? "#10b981" : "#ef4444",
                big: true,
              },
            ].map((row) => (
              <div
                key={row.label}
                className={css({
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 18px",
                  borderRadius: "md",
                  backgroundColor: "background",
                  border: "1px solid",
                  borderColor: "border",
                })}
              >
                <FLPText fontSize={row.big ? "md" : "sm"} fontWeight={row.big ? "bold" : "medium"}>
                  {row.label}
                </FLPText>
                <FLPText
                  fontSize={row.big ? "lg" : "sm"}
                  fontWeight="bold"
                  style={{ color: row.colour }}
                >
                  {row.value}/mo
                </FLPText>
              </div>
            ))}
            <FLPText
              color="text.muted"
              fontSize="xs"
              style={{ marginTop: "8px", lineHeight: "1.6" }}
            >
              You can always edit individual entries from the Budget page. Your data is saved
              automatically when you proceed through each step.
            </FLPText>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div
        className={css({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 32px",
          borderTop: "1px solid",
          borderColor: "border",
          backgroundColor: "background",
        })}
      >
        <FLPButton variant="outline" onClick={isFirst ? onCancel : goBack}>
          {isFirst ? (
            "Cancel"
          ) : (
            <>
              <FaArrowLeft style={{ marginRight: "6px" }} /> Back
            </>
          )}
        </FLPButton>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FLPText color="text.muted" fontSize="xs">
            Step {stepIndex + 1} of {STEPS.length}
          </FLPText>
          <FLPButton
            disabled={saving}
            variant="primary"
            onClick={isLast ? onComplete : saveAllAndProceed}
          >
            {saving ? (
              "Saving..."
            ) : isLast ? (
              <>
                <FaCheckCircle style={{ marginRight: "6px" }} /> Finish Setup
              </>
            ) : (
              <>
                Next <FaArrowRight style={{ marginLeft: "6px" }} />
              </>
            )}
          </FLPButton>
        </div>
      </div>
    </div>
  );
};

export default BudgetSetupWizard;
