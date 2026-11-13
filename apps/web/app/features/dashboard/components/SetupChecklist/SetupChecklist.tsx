import { Icon, ProgressBar, VisuallyHidden } from "@repo/ui";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleCheck,
  House,
  Landmark,
  type LucideIcon,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { type FC, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useResponsive } from "~/context/ResponsiveContext";
import { useSampleMode } from "~/context/SampleModeContext";
import {
  actionButton,
  chevron,
  countBadge,
  dismissButton,
  header,
  headingWrap,
  panel,
  progressWrap,
  statusIcon,
  stepBody,
  stepDescription,
  stepIcon,
  stepItem,
  stepLabel,
  stepList,
  stepTitleRow,
  title,
  titleRow,
  toggle,
  unlockedNote,
} from "./SetupChecklist.styles";

/** Dismissal is remembered per browser, not per account. */
export const SETUP_CHECKLIST_DISMISSED_KEY = "flump_setup_checklist_dismissed";

type StepTone = "warning" | "primary" | "positive" | "purple" | "series";

export interface ChecklistStep {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: StepTone;
  isComplete: boolean;
  actionLabel: string;
  onAction: () => void;
}

export interface SetupChecklistProps {
  hasAccounts: boolean;
  hasProfile: boolean;
  hasBudget: boolean;
  hasSavings?: boolean;
  hasPension?: boolean;
  hasMortgageAccount: boolean;
  hasRunForecast: boolean;
  hasTax?: boolean;
  completedSteps: string[];
  enabledPages?: string[];
  onOpenConnectBank?: () => void;
  onOpenBudgetWizard?: () => void;
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

const readDismissed = (): boolean => {
  try {
    return window.localStorage.getItem(SETUP_CHECKLIST_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
};

const writeDismissed = () => {
  try {
    window.localStorage.setItem(SETUP_CHECKLIST_DISMISSED_KEY, "true");
  } catch {
    // Storage can be blocked or full; the checklist still hides for this visit.
  }
};

const buildSteps = (
  props: SetupChecklistProps,
  navigate: ReturnType<typeof useNavigate>,
): ChecklistStep[] => [
  {
    key: "budget",
    label: "Break down monthly outgoings",
    description:
      "Split your monthly outgoings into housing, bills, living and wants to see your months of cover.",
    icon: Wallet,
    tone: "warning",
    isComplete: props.hasBudget || props.completedSteps.includes("budget"),
    actionLabel: "Drill down budget",
    onAction: props.onOpenBudgetWizard || (() => navigate("/app/budget")),
  },
  {
    key: "accounts",
    label: "Add your accounts",
    description: "Add your current accounts and savings pots.",
    icon: Landmark,
    tone: "primary",
    isComplete: props.hasAccounts || props.completedSteps.includes("accounts"),
    actionLabel: "Add account detail",
    onAction: props.onOpenConnectBank || (() => navigate("/app/accounts")),
  },
  {
    key: "savings",
    label: "Track savings and interest rates",
    description: "Record interest rates (AER) and monthly savings targets.",
    icon: PiggyBank,
    tone: "positive",
    isComplete: !!props.hasSavings || props.completedSteps.includes("savings"),
    actionLabel: "Track savings",
    onAction: () => navigate("/app/savings"),
  },
  {
    key: "pension",
    label: "Refine pension schemes and employer match",
    description: "Add your employer match and track more than one pension pot.",
    icon: ShieldCheck,
    tone: "purple",
    isComplete: !!props.hasPension || props.completedSteps.includes("pension"),
    actionLabel: "Refine pension",
    onAction: () => navigate("/app/pension"),
  },
  {
    key: "mortgage",
    label: "Refine mortgage term and overpayment",
    description:
      "Model monthly overpayments, view your amortisation schedule and compare an ISA with paying down the mortgage.",
    icon: House,
    tone: "positive",
    isComplete: props.hasMortgageAccount || props.completedSteps.includes("mortgage"),
    actionLabel: "Drill down mortgage",
    onAction: () => navigate("/app/mortgage"),
  },
  {
    key: "forecast",
    label: "Explore 10–30 year scenarios",
    description: "Project your net worth over 10–30 years with the growth forecaster in Savings.",
    icon: TrendingUp,
    tone: "series",
    isComplete: props.hasRunForecast || props.completedSteps.includes("forecast"),
    actionLabel: "Model scenarios",
    onAction: () => navigate("/app/savings#forecast"),
  },
  {
    key: "tax",
    label: "Record self-employed or rental tax",
    description:
      "Log income and allowable expenses to see an estimate of your Self Assessment liability.",
    icon: ReceiptText,
    tone: "series",
    isComplete: Boolean(props.hasTax || props.completedSteps.includes("tax")),
    actionLabel: "Open tax tracker",
    onAction: () => navigate("/app/self-assessment"),
  },
];

export const SetupChecklist: FC<SetupChecklistProps> = (props) => {
  const routerNavigate = useNavigate();
  const sample = useSampleMode();
  const { t } = useTranslation();
  // In the signed-out sandbox these pages need an account, so the actions do nothing.
  const navigate = (sample ? () => {} : routerNavigate) as typeof routerNavigate;
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant = props.isMobile ?? (props.variant === "mobile" ? true : contextIsMobile);
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(readDismissed);

  const allSteps = buildSteps(props, navigate);
  const steps = props.enabledPages
    ? allSteps.filter((s) => {
        if (s.key === "profile") return true;
        if (s.key === "runway") return props.enabledPages?.includes("budget");
        // The growth forecaster is a tab in Savings, so its step follows the Savings module.
        if (s.key === "forecast") return props.enabledPages?.includes("savings");
        return props.enabledPages?.includes(s.key);
      })
    : allSteps;

  const completedCount = steps.filter((s) => s.isComplete).length;
  const allComplete = completedCount === steps.length;

  if (dismissed || allComplete) return null;

  const progressText = `${completedCount} of ${steps.length} steps complete`;

  return (
    <section
      aria-labelledby={`${panelId}-title`}
      className={panel()}
      data-testid="setup-checklist"
      id="setup-checklist"
    >
      {/* The heading wraps the toggle so the landmark survives and the whole padded header is the
          click target; the dismiss button sits beside it, not inside it. The dashboard page
          heading is h1 and widgets use h2, so the checklist is a sibling h2. */}
      <div className={header()}>
        <h2 className={headingWrap()} id={`${panelId}-title`}>
          <button
            aria-controls={panelId}
            aria-expanded={expanded}
            className={toggle()}
            type="button"
            onClick={() => setExpanded(!expanded)}
          >
            <span className={titleRow()}>
              <span className={title()}>Refine and drill down your baseline</span>
              <span aria-hidden="true" className={countBadge()}>
                {completedCount} of {steps.length}
              </span>
            </span>
            <span className={chevron()}>
              <Icon icon={expanded ? ChevronUp : ChevronDown} size="sm" />
            </span>
          </button>
        </h2>
        <button
          aria-label="Dismiss setup checklist"
          className={dismissButton()}
          title="Dismiss"
          type="button"
          onClick={() => {
            setDismissed(true);
            writeDismissed();
          }}
        >
          <Icon icon={X} size="sm" />
        </button>
      </div>

      <div className={progressWrap()}>
        <ProgressBar height={4} max={steps.length} value={completedCount} />
      </div>
      <VisuallyHidden aria-atomic="true" role="status">
        {progressText}
      </VisuallyHidden>

      <div hidden={!expanded} id={panelId}>
        <ul className={stepList({ columns: isMobileVariant ? "one" : "responsive" })}>
          {steps.map((step) => (
            <li key={step.key} className={stepItem({ complete: step.isComplete })}>
              <span className={statusIcon({ complete: step.isComplete })}>
                <Icon
                  icon={step.isComplete ? CircleCheck : Circle}
                  label={step.isComplete ? "Complete" : "Not started"}
                />
              </span>

              <div className={stepBody()}>
                <div className={stepTitleRow()}>
                  <span className={stepIcon({ tone: step.tone })}>
                    <Icon icon={step.icon} size="sm" />
                  </span>
                  <span className={stepLabel({ complete: step.isComplete })}>{step.label}</span>
                </div>
                <p className={stepDescription()}>{step.description}</p>
                {step.isComplete ? (
                  <span className={unlockedNote()}>
                    <Icon icon={Check} size="sm" />
                    Widget unlocked on the dashboard
                  </span>
                ) : (
                  <button
                    className={actionButton()}
                    type="button"
                    aria-disabled={sample ? "true" : undefined}
                    onClick={sample ? (event) => event.preventDefault() : step.onAction}
                  >
                    {sample ? t("signUpToOpen", "Sign up to open") : step.actionLabel}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default SetupChecklist;
