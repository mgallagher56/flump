import { Check } from "lucide-react";
import type { FC } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon";
import { VisuallyHidden } from "../VisuallyHidden";
import {
  stepperCompact,
  stepperCompactCount,
  stepperCompactName,
  stepperItem,
  stepperLabel,
  stepperList,
  stepperMarker,
  stepperRoot,
  stepperSegment,
  stepperSegments,
  stepperStatus,
  stepperText,
} from "./Stepper.styles";

export type StepState = "complete" | "current" | "upcoming";

export interface StepperStep {
  id: string;
  /** Short step name, for example "Housing and outgoings". */
  label: string;
}

export interface StepperProps {
  steps: StepperStep[];
  /** The current step, counting from 1. Earlier steps are complete, later ones upcoming. */
  current: number;
  /** Accessible name for the step list. Defaults to "Setup progress". */
  label?: string;
  className?: string;
}

const statusWords: Record<StepState, string> = {
  complete: "Complete",
  current: "Current step",
  upcoming: "Up next",
};

export const Stepper: FC<StepperProps> = ({
  steps,
  current,
  label = "Setup progress",
  className,
}) => {
  const total = steps.length;
  const currentIndex = Math.min(Math.max(Math.round(current), 1), Math.max(total, 1)) - 1;
  const stateOf = (index: number): StepState =>
    index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming";
  const currentStep = steps[currentIndex];

  return (
    <div className={cx(stepperRoot(), className)}>
      {/* Phone: a short summary replaces the full row (the row is display:none there). */}
      <div className={stepperCompact()} data-testid="stepper-summary">
        <p className={stepperCompactCount()}>
          Step {currentIndex + 1} of {total}
        </p>
        {currentStep ? <p className={stepperCompactName()}>{currentStep.label}</p> : null}
        <ul aria-hidden="true" className={stepperSegments()}>
          {steps.map((step, index) => (
            <li className={stepperSegment({ state: stateOf(index) })} key={step.id} />
          ))}
        </ul>
      </div>
      <ol aria-label={label} className={stepperList()}>
        {steps.map((step, index) => {
          const state = stateOf(index);
          return (
            <li
              aria-current={state === "current" ? "step" : undefined}
              className={stepperItem()}
              data-state={state}
              key={step.id}
            >
              <span aria-hidden="true" className={stepperMarker({ state })}>
                {state === "complete" ? <Icon icon={Check} size="md" /> : index + 1}
              </span>
              <span className={stepperText()}>
                <span className={stepperLabel({ state })}>
                  <VisuallyHidden>{`Step ${index + 1} of ${total}: `}</VisuallyHidden>
                  {step.label}
                </span>
                <span className={stepperStatus()}>{statusWords[state]}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default Stepper;
