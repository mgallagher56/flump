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
  it("offers four housing answers with equal weight and none chosen until the person picks", () => {
    setup();
    expect(screen.getByRole("group", { name: "Your housing" })).toBeDefined();
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.map((r) => r.labels?.[0]?.textContent?.trim())).toEqual([
      "Renting",
      "Paying a mortgage",
      "Own with no mortgage",
      "Living with family or friends",
    ]);
    // Not answered is never presumed to be renting.
    expect(radios.every((r) => !r.checked)).toBe(true);
    expect(screen.queryByLabelText(/monthly rent/i)).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /own with no mortgage/i }));
    expect(radioChecked(/own with no mortgage/i)).toBe(true);
    expect(radioChecked(/renting/i)).toBe(false);
  });

  it("shows rent only when renting", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: /renting/i }));
    expect(screen.getByLabelText(/monthly rent/i)).toBeDefined();
    expect(screen.queryByLabelText(/mortgage left to pay/i)).toBeNull();
    expect(screen.queryByLabelText(/what your home is worth/i)).toBeNull();
  });

  it("shows value and balance for a mortgage, value only when owning with no mortgage", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: /paying a mortgage/i }));
    expect(screen.getByLabelText(/mortgage left to pay/i)).toBeDefined();
    fireEvent.click(screen.getByRole("radio", { name: /own with no mortgage/i }));
    expect(screen.queryByLabelText(/mortgage left to pay/i)).toBeNull();
    expect(screen.queryByLabelText(/monthly rent|monthly mortgage/i)).toBeNull();
    expect(screen.getByLabelText(/what your home is worth/i)).toBeDefined();
  });

  it("shows the equity once a home value is typed, whole home (no share asked)", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: /paying a mortgage/i }));
    expect(screen.queryByTestId("home-equity-line")).toBeNull();
    fireEvent.change(screen.getByLabelText(/what your home is worth/i), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText(/mortgage left to pay/i), {
      target: { value: "200000" },
    });
    // 300,000 - 200,000 = 100,000.
    const line = screen.getByTestId("home-equity-line");
    expect(line.textContent).toContain("£100,000");
    expect(line.textContent).not.toMatch(/share/);
  });

  it("owning with no mortgage shows the whole value as equity", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: /own with no mortgage/i }));
    fireEvent.change(screen.getByLabelText(/what your home is worth/i), {
      target: { value: "275000" },
    });
    expect(screen.getByTestId("home-equity-line").textContent).toContain("£275,000");
  });

  it("living with family or friends asks only an optional amount, with no rent, mortgage or property fields", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: /living with family or friends/i }));
    const amount = screen.getByLabelText(
      /what you pay each month \(optional\)/i,
    ) as HTMLInputElement;
    expect(amount.required).toBe(false);
    expect(
      screen.getByText("You can add what you pay towards the household, if anything."),
    ).toBeDefined();
    expect(screen.queryByLabelText(/monthly rent|monthly mortgage/i)).toBeNull();
    expect(screen.queryByLabelText(/mortgage left to pay/i)).toBeNull();
    expect(screen.queryByLabelText(/what your home is worth/i)).toBeNull();
  });

  it("offers Skip this step as a text link", () => {
    const onSkip = vi.fn();
    setup(onSkip);
    fireEvent.click(screen.getByRole("button", { name: "Skip this step" }));
    expect(onSkip).toHaveBeenCalled();
  });
});
