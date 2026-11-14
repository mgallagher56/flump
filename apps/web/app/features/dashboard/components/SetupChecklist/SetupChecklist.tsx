import { Button, Icon } from "@repo/ui";
import { ChevronDown, ChevronUp, Circle, CircleCheck, X } from "lucide-react";
import { type FC, useId, useState } from "react";
import { Link } from "react-router";
import {
  dismissButton,
  header,
  headingWrap,
  panel,
  statusIcon,
  stepBody,
  stepDescription,
  stepItem,
  stepLabel,
  stepList,
  toggle,
  toggleText,
} from "./SetupChecklist.styles";

/** Dismissal is remembered per browser, not per account. */
export const SETUP_CHECKLIST_DISMISSED_KEY = "flump_setup_checklist_dismissed";

export interface ChecklistStep {
  key: string;
  label: string;
  description: string;
  isComplete: boolean;
  actionLabel: string;
  href: string;
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

/** App housekeeping only: each step adds figures to Flump, never a money task (R4). */
export const buildSteps = (props: SetupChecklistProps): ChecklistStep[] => [
  {
    key: "budget",
    label: "Add your monthly spending",
    description:
      "Split your spending into housing, bills, living costs and extras to see your months of cover.",
    isComplete: props.hasBudget || props.completedSteps.includes("budget"),
    actionLabel: "Add spending",
    href: "/app/budget",
  },
  {
    key: "accounts",
    label: "Add your accounts",
    description: "Add your current and savings accounts.",
    isComplete: props.hasAccounts || props.completedSteps.includes("accounts"),
    actionLabel: "Add account",
    href: "/app/accounts",
  },
  {
    key: "savings",
    label: "Add your savings rates",
    description: "Add the interest rate (AER) on each account and what you pay in each month.",
    isComplete: !!props.hasSavings || props.completedSteps.includes("savings"),
    actionLabel: "Add savings rates",
    href: "/app/savings",
  },
  {
    key: "pension",
    label: "Add your pension details",
    description: "Add what your employer pays in, and any other pension pots.",
    isComplete: !!props.hasPension || props.completedSteps.includes("pension"),
    actionLabel: "Add pension details",
    href: "/app/pension",
  },
  {
    key: "mortgage",
    label: "Add your mortgage details",
    description: "Add your balance, rate and term to see your repayment schedule.",
    isComplete: props.hasMortgageAccount || props.completedSteps.includes("mortgage"),
    actionLabel: "Add mortgage details",
    href: "/app/mortgage",
  },
  {
    key: "tax",
    label: "Add self-employed or rental income",
    description:
      "Add income and allowable expenses to see an estimate of your Self Assessment tax bill.",
    isComplete: Boolean(props.hasTax || props.completedSteps.includes("tax")),
    actionLabel: "Open Self Assessment",
    href: "/app/self-assessment",
  },
];

/**
 * One row under the KPI strip: "Finish setting up: 2 of 5 done". It expands on click to list the
 * steps and disappears once every step is done (or the user hides it).
 */
export const SetupChecklist: FC<SetupChecklistProps> = (props) => {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(readDismissed);

  const steps = props.enabledPages
    ? buildSteps(props).filter((s) => props.enabledPages?.includes(s.key))
    : buildSteps(props);
  const completedCount = steps.filter((s) => s.isComplete).length;

  if (dismissed || steps.length === 0 || completedCount === steps.length) return null;

  return (
    <section
      aria-labelledby={`${panelId}-title`}
      className={panel()}
      data-testid="setup-checklist"
      id="setup-checklist"
    >
      <div className={header()}>
        <h2 className={headingWrap()} id={`${panelId}-title`}>
          <button
            aria-controls={panelId}
            aria-expanded={expanded}
            className={toggle()}
            data-testid="setup-checklist-toggle"
            id="setup-checklist-toggle"
            type="button"
            onClick={() => setExpanded(!expanded)}
          >
            <span className={toggleText()}>
              Finish setting up: {completedCount} of {steps.length} done
            </span>
            <Icon icon={expanded ? ChevronUp : ChevronDown} size="sm" />
          </button>
        </h2>
        <button
          aria-label="Hide setup checklist"
          className={dismissButton()}
          data-testid="setup-checklist-hide"
          id="setup-checklist-hide"
          title="Hide setup checklist"
          type="button"
          onClick={() => {
            setDismissed(true);
            writeDismissed();
          }}
        >
          <Icon icon={X} size="sm" />
        </button>
      </div>

      <div hidden={!expanded} id={panelId}>
        <ul className={stepList()}>
          {steps.map((step) => (
            <li className={stepItem()} key={step.key}>
              <span className={statusIcon()}>
                <Icon
                  icon={step.isComplete ? CircleCheck : Circle}
                  label={step.isComplete ? "Done" : "Not done"}
                />
              </span>
              <div className={stepBody()}>
                <span className={stepLabel()}>{step.label}</span>
                <p className={stepDescription()}>{step.description}</p>
                {step.isComplete ? null : (
                  <Button asChild size="sm" variant="ghost">
                    <Link to={step.href}>{step.actionLabel}</Link>
                  </Button>
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
