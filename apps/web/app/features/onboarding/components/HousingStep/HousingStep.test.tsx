import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StepHarness } from "../../testing";
import type { HousingStatus } from "../../types";
import { HousingStep } from "./HousingStep";

const setup = (onSkip = vi.fn()) =>
  render(
    <StepHarness>
      {({ values, update }) => (
        <HousingStep
          onBack={vi.fn()}
          onNext={vi.fn()}
          onSkip={onSkip}
          setHousingStatus={(housingStatus: HousingStatus) => update({ housingStatus })}
          update={update}
          values={values}
        />
      )}
    </StepHarness>,
  );

/** jest-dom is not set up in apps/web, so read the native checked state. */
const radioChecked = (name: RegExp) =>
  (screen.getByRole("radio", { name }) as HTMLInputElement).checked;

describe("<HousingStep />", () => {
  it("offers housing status as a named radio group with renting chosen", () => {
    setup();
    expect(screen.getByRole("group", { name: "Housing status" })).toBeDefined();
    expect(radioChecked(/renting/i)).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /own outright/i }));
    expect(radioChecked(/own outright/i)).toBe(true);
    expect(radioChecked(/renting/i)).toBe(false);
  });

  it("shows rent only when renting", () => {
    setup();
    expect(screen.getByLabelText(/monthly rent/i)).toBeDefined();
    expect(screen.queryByLabelText(/mortgage balance/i)).toBeNull();
  });

  it("shows value and balance for a mortgage, value only when owning outright", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: /mortgage/i }));
    expect(screen.getByLabelText(/mortgage balance/i)).toBeDefined();
    fireEvent.click(screen.getByRole("radio", { name: /own outright/i }));
    expect(screen.queryByLabelText(/mortgage balance/i)).toBeNull();
    expect(screen.queryByLabelText(/monthly rent|monthly mortgage/i)).toBeNull();
    expect(screen.getByLabelText(/property value/i)).toBeDefined();
  });

  it("calls onSkip", () => {
    const onSkip = vi.fn();
    setup(onSkip);
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(onSkip).toHaveBeenCalled();
  });
});
