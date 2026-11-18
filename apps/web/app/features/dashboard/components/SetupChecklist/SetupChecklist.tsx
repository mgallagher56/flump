import {
  Button,
  budgetSproutShapes,
  Icon,
  InlineAlert,
  ProgressRing,
  SceneShapeList,
  useSetupProgressOnce,
} from "@repo/ui";
import { ChevronDown, ChevronUp, Circle, CircleCheck, X } from "lucide-react";
import { type FC, useId, useMemo, useState } from "react";
import { Link } from "react-router";
import { formatWarmConfirmation } from "../../../snapshot/snapshotCopy";

import {
  dismissButton,
  finishBody,
  finishCopy,
  finishHeading,
  finishIllustration,
  finishRow,
  header,
  headingWrap,
  panel,
  statusIcon,
  stepActions,
  stepBody,
  stepDescription,
  stepItem,
  stepLabel,
  stepList,
  stepListWrap,
  toggle,
  toggleMeta,
  toggleNext,
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
  /** Marks a setup step as "Not for me" so it counts toward setup completion. */
  onSkipStep?: (stepKey: string) => void | Promise<void>;
  /** Gentle inline error if saving a skipped step failed. */
  skipError?: string | null;
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
      "Split your spending into housing, bills, living costs and extras to see your breathing room.",
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

const selectStepsForPages = (props: SetupChecklistProps): ChecklistStep[] => {
  const all = buildSteps(props);
  return props.enabledPages ? all.filter((s) => props.enabledPages?.includes(s.key)) : all;
};

/**
 * Compact `2A` setup row with a circular progress ring, the next step inline and one expand toggle.
 * Every unfinished step can also be skipped with "Not for me", and completing the final step on a
 * visit transitions once to the `2C` "Setup finished" state.
 */
export const SetupChecklist: FC<SetupChecklistProps> = (props) => {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [localSkipped, setLocalSkipped] = useState<string[]>([]);
  // Captured once on mount so the finish card appears when a user finishes during a visit,
  // while users whose setup was already done when opening the dashboard never see it.
  const [startedIncomplete] = useState(() => {
    const initial = selectStepsForPages(props);
    return initial.length > 0 && initial.some((s) => !s.isComplete);
  });

  const mergedCompleted = useMemo(
    () => Array.from(new Set([...props.completedSteps, ...localSkipped])),
    [props.completedSteps, localSkipped],
  );
  const steps = useMemo(
    () => selectStepsForPages({ ...props, completedSteps: mergedCompleted }),
    [props, mergedCompleted],
  );
  const completedCount = steps.filter((s) => s.isComplete).length;
  const { currentValue: animatedCompletedCount } = useSetupProgressOnce(completedCount);
  const nextStep = steps.find((s) => !s.isComplete) ?? null;

  const handleDismiss = () => {
    setDismissed(true);
    writeDismissed();
  };

  const handleSkip = (stepKey: string) => {
    if (props.onSkipStep) {
      void props.onSkipStep(stepKey);
      return;
    }
    setLocalSkipped((prev) => (prev.includes(stepKey) ? prev : [...prev, stepKey]));
  };

  if (dismissed || steps.length === 0) return null;

  if (completedCount === steps.length) {
    if (!startedIncomplete) return null;
    return (
      <section
        aria-labelledby={`${panelId}-finished-title`}
        className={panel()}
        data-setup-finished=""
        data-testid="setup-checklist"
        id="setup-checklist"
      >
        <div
          className={finishRow()}
          data-testid="setup-checklist-finished"
          id="setup-checklist-finished"
        >
          <svg
            aria-hidden="true"
            className={finishIllustration()}
            focusable="false"
            role="presentation"
            viewBox="143 18 48 46"
          >
            <SceneShapeList shapes={budgetSproutShapes} />
          </svg>
          <div className={finishCopy()}>
            <h2 className={finishHeading()} id={`${panelId}-finished-title`}>
              Setup finished
            </h2>
            <p className={finishBody()}>{formatWarmConfirmation({ kind: "setupComplete" })}</p>
          </div>
          <button
            aria-label="Hide setup checklist"
            className={dismissButton()}
            data-testid="setup-checklist-hide"
            id="setup-checklist-hide"
            title="Hide setup checklist"
            type="button"
            onClick={handleDismiss}
          >
            <Icon icon={X} size="sm" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={`${panelId}-title`}
      className={panel()}
      data-testid="setup-checklist"
      id="setup-checklist"
    >
      <div className={header()}>
        <ProgressRing
          animatedValue={animatedCompletedCount}
          id="setup-checklist-ring"
          label="Setup progress"
          max={steps.length}
          value={completedCount}
        />
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
            <span className={toggleMeta()}>
              <span className={toggleText()}>Finish setting up</span>
              {!expanded && nextStep ? (
                <span className={toggleNext()}>Next: {nextStep.label}</span>
              ) : null}
            </span>
            <Icon icon={expanded ? ChevronUp : ChevronDown} size="sm" />
          </button>
        </h2>
        {!expanded && nextStep ? (
          <Button asChild id="setup-checklist-next-action" size="sm" variant="secondary">
            <Link to={nextStep.href}>{nextStep.actionLabel}</Link>
          </Button>
        ) : null}
        <button
          aria-label="Hide setup checklist"
          className={dismissButton()}
          data-testid="setup-checklist-hide"
          id="setup-checklist-hide"
          title="Hide setup checklist"
          type="button"
          onClick={handleDismiss}
        >
          <Icon icon={X} size="sm" />
        </button>
      </div>

      <div className={stepListWrap()} hidden={!expanded} id={panelId}>
        {props.skipError ? <InlineAlert tone="danger">{props.skipError}</InlineAlert> : null}
        <ul className={stepList()}>
          {steps.map((step) => {
            const isNext = nextStep?.key === step.key;
            const itemState = step.isComplete ? "done" : isNext ? "next" : "todo";
            return (
              <li
                className={stepItem({ state: itemState })}
                data-setup-next={isNext ? "true" : undefined}
                key={step.key}
              >
                <span className={statusIcon({ done: step.isComplete })}>
                  <Icon
                    icon={step.isComplete ? CircleCheck : Circle}
                    label={step.isComplete ? "Done" : "Not done"}
                  />
                </span>
                <div className={stepBody()}>
                  <span className={stepLabel()}>{step.label}</span>
                  <p className={stepDescription()}>{step.description}</p>
                  {step.isComplete ? null : (
                    <div className={stepActions()}>
                      <Button asChild size="sm" variant={isNext ? "secondary" : "outline"}>
                        <Link to={step.href}>{step.actionLabel}</Link>
                      </Button>
                      <Button
                        aria-label={`Not for me, skip ${step.label}`}
                        onClick={() => handleSkip(step.key)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Not for me
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default SetupChecklist;
