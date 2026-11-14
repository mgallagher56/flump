import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AGE_ERROR } from "../../age";
import { StepHarness } from "../../testing";
import type { OnboardingValues } from "../../types";
import {
  IncomeStep,
  MISSING_GROSS_ERROR,
  MISSING_REGION_ERROR,
  MISSING_TAKE_HOME_ERROR,
} from "./IncomeStep";

const setup = ({
  onNext = vi.fn(),
  initial,
  showMissing,
}: {
  onNext?: () => void;
  initial?: Partial<OnboardingValues>;
  showMissing?: boolean;
} = {}) =>
  render(
    <StepHarness initial={initial}>
      {({ values, update }) => (
        <IncomeStep onNext={onNext} showMissing={showMissing} update={update} values={values} />
      )}
    </StepHarness>,
  );

/** The region error repeats the select's placeholder, so text queries skip the option. */
const NOT_OPTION = { ignore: "script, style, option" };

const grossInput = () =>
  screen.getByRole("textbox", { name: /^yearly salary before tax/i }) as HTMLInputElement;
/** jest-dom is not set up in apps/web, so read the native checked state. */
const radioChecked = (name: RegExp) =>
  (screen.getByRole("radio", { name }) as HTMLInputElement).checked;
const regionSelect = () => screen.getByRole("combobox", { name: /where do you pay tax/i });

describe("<IncomeStep />", () => {
  it("switches between gross and take-home entry", () => {
    setup();
    expect(grossInput()).toBeDefined();
    fireEvent.click(screen.getByRole("radio", { name: /^take-home pay/i }));
    expect(radioChecked(/^take-home pay/i)).toBe(true);
    expect(screen.getByRole("textbox", { name: /monthly take-home pay/i })).toBeDefined();
    expect(screen.queryByRole("group", { name: /example salaries/i })).toBeNull();
  });

  it("keeps an empty income empty and a typed 0 as 0", () => {
    setup();
    expect(grossInput().value).toBe("");
    fireEvent.change(grossInput(), { target: { value: "0" } });
    expect(grossInput().value).toBe("0");
  });

  it("offers both employment types as a named radio group", () => {
    setup();
    expect(screen.getByRole("group", { name: "How you earn" })).toBeDefined();
    expect(radioChecked(/^employed/i)).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /self-employed/i }));
    expect(radioChecked(/self-employed/i)).toBe(true);
    expect(radioChecked(/^employed/i)).toBe(false);
  });

  it("formats salary presets in en-GB and fills the salary", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "£45,000" }));
    expect(screen.getByRole("button", { name: "£45,000" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(grossInput().value).toBe("45,000");
  });

  it("marks income and tax region as required", () => {
    setup();
    expect(grossInput().required).toBe(true);
    expect((regionSelect() as HTMLSelectElement).required).toBe(true);
  });

  it("chooses a tax region from the shared select", () => {
    setup();
    fireEvent.change(regionSelect(), { target: { value: "SCOTLAND" } });
    expect((regionSelect() as HTMLSelectElement).value).toBe("SCOTLAND");
  });

  it("flags only the missing fields when sent here from the review", () => {
    setup({ showMissing: true, initial: { taxRegion: "WALES" } });
    expect(grossInput().getAttribute("aria-invalid")).toBe("true");
    expect(grossInput().getAttribute("aria-describedby")).toContain("baseline-income-error");
    expect(screen.getByText(MISSING_GROSS_ERROR)).toBeDefined();
    expect(regionSelect().hasAttribute("aria-invalid")).toBe(false);
    expect(screen.queryByText(MISSING_REGION_ERROR, NOT_OPTION)).toBeNull();
  });

  it("clears a missing-field error once the field is filled", () => {
    setup({ showMissing: true, initial: { incomeMode: "net" } });
    expect(screen.getByText(MISSING_TAKE_HOME_ERROR)).toBeDefined();
    expect(screen.getByText(MISSING_REGION_ERROR, NOT_OPTION)).toBeDefined();
    fireEvent.change(regionSelect(), { target: { value: "ENGLAND" } });
    expect(screen.queryByText(MISSING_REGION_ERROR, NOT_OPTION)).toBeNull();
  });

  it("shows no missing-field errors by default", () => {
    setup();
    expect(grossInput().hasAttribute("aria-invalid")).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("explains an age that cannot be saved", () => {
    setup();
    const age = screen.getByRole("spinbutton", { name: /your age/i });
    fireEvent.change(age, { target: { value: "12" } });
    expect(screen.getByText(AGE_ERROR)).toBeDefined();
    expect(age.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(age, { target: { value: "40" } });
    expect(screen.queryByText(AGE_ERROR)).toBeNull();
  });

  it("is a required step: Next only, with no skip and no Back", () => {
    const onNext = vi.fn();
    setup({ onNext });
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(screen.queryByRole("button", { name: /skip/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^next/i }));
    expect(onNext).toHaveBeenCalled();
  });
});
