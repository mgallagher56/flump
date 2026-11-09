import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheckCircle,
  FaPiggyBank,
  FaPlus,
  FaRegCircle,
  FaTrash,
} from "react-icons/fa";
import { Link } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCheckbox from "~/components/core/inputs/checkbox/FLPCheckbox";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { BudgetCategory, BudgetEntry } from "~/types/budget";
import { CATEGORY_ICONS, toMonthly } from "~/types/budget";

interface BudgetSetupWizardProps {
  entries: BudgetEntry[];
  onUpdateEntry: (id: string, update: Partial<BudgetEntry>) => Promise<void>;
  onAddEntry: (
    entry: Omit<BudgetEntry, "id" | "userId" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
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
  symbol: string;
  onUpdate: (id: string, update: Partial<BudgetEntry>) => void;
  onDelete: (id: string) => void;
  deleting?: boolean;
}

const EntryRow: FC<EntryRowProps> = ({ entry, symbol, onUpdate, onDelete, deleting }) => (
  <div
    className={css({
      display: "grid",
      gridTemplateColumns: "1fr auto auto",
      gap: "12px",
      alignItems: "center",
      padding: "10px 0",
      borderBottom: "1px solid",
      borderColor: "border",
    })}
  >
    <div style={{ minWidth: 0 }}>
      <FLPText
        fontSize="sm"
        fontWeight="medium"
        style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {entry.name}
      </FLPText>
      {!entry.isIncome && (
        <button
          type="button"
          onClick={() => onUpdate(entry.id, { isEssential: !entry.isEssential })}
          className={css({
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: "10px",
            fontWeight: "semibold",
            color: entry.isEssential ? "success.500" : "text.muted",
            _hover: { textDecoration: "underline" },
          })}
          title="Click to toggle essential vs discretionary"
        >
          {entry.isEssential ? "essential" : "discretionary"}
        </button>
      )}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <span style={{ color: "var(--colors-text-muted)", fontSize: "14px" }}>{symbol}</span>
      <input
        className={inputStyle}
        min="0"
        step="1"
        style={{ width: "90px", textAlign: "right" }}
        type="number"
        value={Number.isFinite(Number(entry.amount)) ? Number(entry.amount) : 0}
        onChange={(e) => onUpdate(entry.id, { amount: Number(e.target.value) || 0 })}
      />
      <select
        aria-label={`Frequency for ${entry.name}`}
        className={css({
          padding: "8px 6px",
          fontSize: "xs",
          borderRadius: "sm",
          border: "1px solid",
          borderColor: "border",
          backgroundColor: "surface",
          color: "text.muted",
          cursor: "pointer",
        })}
        value={entry.frequency}
        onChange={(e) =>
          onUpdate(entry.id, { frequency: e.target.value as BudgetEntry["frequency"] })
        }
      >
        <option value="monthly">/mo</option>
        <option value="annual">/yr</option>
        <option value="weekly">/wk</option>
      </select>
    </div>
    <button
      type="button"
      disabled={deleting}
      title={`Remove ${entry.name}`}
      onClick={() => onDelete(entry.id)}
      className={css({
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        borderRadius: "md",
        border: "none",
        backgroundColor: "transparent",
        color: "text.muted",
        cursor: "pointer",
        transition: "all 0.15s ease",
        _hover: {
          color: "destructive",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
        },
      })}
    >
      <FaTrash size={12} />
    </button>
  </div>
);

const BudgetSetupWizard: FC<BudgetSetupWizardProps> = ({
  entries,
  onUpdateEntry,
  onAddEntry,
  onDeleteEntry,
  onComplete,
  onCancel,
  monthlyTakeHome,
}) => {
  const { formatCurrency, symbol } = useFormatCurrency();
  const [currentStep, setCurrentStep] = useState<WizardStep>("welcome");
  const [localUpdates, setLocalUpdates] = useState<Record<string, Partial<BudgetEntry>>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Inline add item form state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newIsEssential, setNewIsEssential] = useState(true);
  const [adding, setAdding] = useState(false);

  const resetAddForm = () => {
    setIsAdding(false);
    setNewName("");
    setNewAmount("");
    setNewIsEssential(true);
  };

  const handleAddItem = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const isIncome = currentStep === "income";
      const amt = Number(newAmount) || 0;
      await onAddEntry({
        category: currentStep as BudgetCategory,
        name: newName.trim(),
        amount: amt,
        frequency: "monthly",
        isIncome,
        isPrimaryIncome: false,
        isEssential: isIncome ? true : newIsEssential,
        notes: null,
        isDefault: false,
      });
      resetAddForm();
    } catch (err) {
      console.error("Failed to add entry in wizard:", err);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteEntry(id);
      setLocalUpdates((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      console.error("Failed to delete entry in wizard:", err);
    } finally {
      setDeletingId(null);
    }
  };

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
    resetAddForm();
    setSaving(true);
    try {
      const updateEntries = Object.entries(localUpdates);
      if (updateEntries.length > 0) {
        await Promise.all(updateEntries.map(([id, update]) => onUpdateEntry(id, update)));
        setLocalUpdates({});
      }
      const next = STEPS[stepIndex + 1];
      if (next) setCurrentStep(next);
    } catch (err) {
      console.error("Failed to save budget entries during wizard step:", err);
      // Advance to next step even if saving had an error so wizard is not stuck
      const next = STEPS[stepIndex + 1];
      if (next) setCurrentStep(next);
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    resetAddForm();
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

  const fmt = (n: number | string | null | undefined) => {
    const val = Number(n);
    if (!Number.isFinite(val)) return formatCurrency(0);
    return formatCurrency(Math.abs(val));
  };

  // Progress bar
  const progressPct = (stepIndex / (STEPS.length - 1)) * 100;

  const renderAddSection = () => {
    if (isAdding) {
      return (
        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "14px",
            borderRadius: "md",
            backgroundColor: "background",
            border: "1px dashed",
            borderColor: "primary",
            marginTop: "10px",
          })}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <FLPText color="primary" fontSize="xs" fontWeight="semibold">
              Add New {STEP_LABELS[currentStep]} Item
            </FLPText>
            <button
              className={css({
                background: "none",
                border: "none",
                color: "text.muted",
                cursor: "pointer",
                fontSize: "xs",
                "&:hover": { color: "text.primary" },
              })}
              type="button"
              onClick={resetAddForm}
            >
              Cancel
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "10px" }}>
            <input
              className={inputStyle}
              placeholder={
                currentStep === "income"
                  ? "e.g. Side Gig, Freelance"
                  : currentStep === "housing"
                    ? "e.g. Service Charge, Parking"
                    : currentStep === "bills"
                      ? "e.g. TV Licence, Streaming"
                      : currentStep === "savings"
                        ? "e.g. Holiday Fund, Sinking Fund"
                        : "e.g. Gym, Subscriptions"
              }
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddItem();
                if (e.key === "Escape") resetAddForm();
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ color: "var(--colors-text-muted)", fontSize: "14px" }}>{symbol}</span>
              <input
                className={inputStyle}
                min="0"
                placeholder="0"
                step="1"
                style={{ textAlign: "right" }}
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddItem();
                  if (e.key === "Escape") resetAddForm();
                }}
              />
              <FLPText color="text.muted" fontSize="xs" style={{ width: "24px" }}>
                /mo
              </FLPText>
            </div>
          </div>
          {currentStep !== "income" && (
            <FLPCheckbox
              checked={newIsEssential}
              id="budget-essential-expense-checkbox"
              label={
                <FLPText color="text.muted" fontSize="xs">
                  Essential expense (uncheck if discretionary / nice-to-have)
                </FLPText>
              }
              size="sm"
              onChange={(e) => setNewIsEssential(e.target.checked)}
            />
          )}
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}
          >
            <FLPButton
              disabled={adding}
              size="sm"
              type="button"
              variant="outline"
              onClick={resetAddForm}
            >
              Cancel
            </FLPButton>
            <FLPButton
              disabled={adding || !newName.trim()}
              size="sm"
              type="button"
              variant="primary"
              onClick={handleAddItem}
            >
              {adding ? "Adding..." : "Add Item"}
            </FLPButton>
          </div>
        </div>
      );
    }

    return (
      <button
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          padding: "10px",
          marginTop: "10px",
          borderRadius: "md",
          border: "1px dashed",
          borderColor: "border",
          backgroundColor: "transparent",
          color: "text.muted",
          fontSize: "xs",
          fontWeight: "medium",
          cursor: "pointer",
          transition: "all 0.15s ease",
          _hover: {
            borderColor: "primary",
            color: "primary",
            backgroundColor: "rgba(99, 99, 241, 0.04)",
          },
        })}
        type="button"
        onClick={() => {
          setIsAdding(true);
          setNewName("");
          setNewAmount("");
          setNewIsEssential(currentStep !== "expenses");
        }}
      >
        <FaPlus size={11} /> Add {STEP_LABELS[currentStep]} item
      </button>
    );
  };

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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                })}
              >
                <FLPText color="success.500" fontSize="xs">
                  💡 Your profile has a monthly take-home of <strong>{fmt(monthlyTakeHome)}</strong>
                  . Update the salary entry below to match.
                </FLPText>
                {getCategoryEntries("income").length > 0 && (
                  <button
                    type="button"
                    className={css({
                      fontSize: "xs",
                      fontWeight: "semibold",
                      color: "success.500",
                      backgroundColor: "surface",
                      border: "1px solid rgba(16, 185, 129, 0.4)",
                      borderRadius: "sm",
                      padding: "4px 10px",
                      cursor: "pointer",
                      _hover: { backgroundColor: "rgba(16, 185, 129, 0.15)" },
                    })}
                    onClick={() => {
                      const primary =
                        getCategoryEntries("income").find((e) => e.isPrimaryIncome) ??
                        getCategoryEntries("income")[0];
                      if (primary) {
                        localUpdate(primary.id, {
                          amount: monthlyTakeHome,
                          frequency: "monthly",
                        });
                      }
                    }}
                  >
                    Apply {fmt(monthlyTakeHome)}
                  </button>
                )}
              </div>
            )}
            {getCategoryEntries("income").map((e) => (
              <EntryRow
                key={e.id}
                deleting={deletingId === e.id}
                entry={e}
                symbol={symbol}
                onDelete={handleDeleteItem}
                onUpdate={localUpdate}
              />
            ))}
            {getCategoryEntries("income").length === 0 && (
              <div style={{ padding: "16px 0", textAlign: "center" }}>
                <FLPText color="text.muted" fontSize="xs">
                  No income items yet. Add your salary or other earnings below.
                </FLPText>
              </div>
            )}
            {renderAddSection()}
          </div>
        )}

        {(currentStep === "housing" ||
          currentStep === "bills" ||
          currentStep === "expenses" ||
          currentStep === "savings") && (
          <div className={css({ display: "flex", flexDirection: "column", gap: "4px" })}>
            {getCategoryEntries(currentStep).map((e) => (
              <EntryRow
                key={e.id}
                deleting={deletingId === e.id}
                entry={e}
                symbol={symbol}
                onDelete={handleDeleteItem}
                onUpdate={localUpdate}
              />
            ))}
            {getCategoryEntries(currentStep).length === 0 && (
              <div style={{ padding: "16px 0", textAlign: "center" }}>
                <FLPText color="text.muted" fontSize="xs">
                  No items in this category. Click below to add one.
                </FLPText>
              </div>
            )}
            {renderAddSection()}
            {currentStep === "savings" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  marginTop: "16px",
                }}
              >
                <FaPiggyBank style={{ color: "#10b981", fontSize: "18px", flexShrink: 0 }} />
                <FLPText fontSize="xs">
                  Tip: Want to track specific savings pots, AER rates, and compound growth? You can
                  manage and forecast multi-account savings anytime in the{" "}
                  <Link
                    to="/app/savings"
                    style={{
                      color: "var(--colors-primary)",
                      fontWeight: "bold",
                      textDecoration: "underline",
                    }}
                  >
                    Savings Hub
                  </Link>
                  .
                </FLPText>
              </div>
            )}
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
        <FLPButton type="button" variant="outline" onClick={isFirst ? onCancel : goBack}>
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
            type="button"
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
