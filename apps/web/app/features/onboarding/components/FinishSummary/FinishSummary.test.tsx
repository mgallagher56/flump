import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { REGION_ASSUMPTION_LABEL } from "~/utils/taxTrapCopy";
import { deriveOnboardingSummary } from "../../deriveOnboardingSummary";
import { inferModules } from "../../inferModules";
import { INITIAL_VALUES, type OnboardingValues } from "../../types";
import type { FinishSaveState } from "../../useFinishOnboarding";
import { FinishSummary, SAVED_NOTES } from "./FinishSummary";

const setup = (
  patch: Partial<OnboardingValues>,
  extra: {
    isSubmitting?: boolean;
    error?: string | null;
    saveState?: FinishSaveState;
    onFixMissing?: () => void;
  } = {},
) => {
  const values = { ...INITIAL_VALUES, ...patch };
  const handlers = { onFinish: vi.fn(), onBack: vi.fn(), onEdit: vi.fn() };
  render(
    <FinishSummary
      error={extra.error}
      isSubmitting={extra.isSubmitting ?? false}
      onFixMissing={extra.onFixMissing}
      saveState={extra.saveState}
      modules={inferModules(values)}
      summary={deriveOnboardingSummary(values)}
      values={values}
      {...handlers}
    />,
  );
  return handlers;
};

/** The value shown beside a review row label. */
const rowValue = (label: string) =>
  screen.getByText(label, { selector: "dt" }).nextElementSibling?.textContent;

describe("<FinishSummary />", () => {
  it("shows the take-home estimate in the default style, never the hero (D2)", () => {
    const { container } = render(
      <FinishSummary
        isSubmitting={false}
        modules={["accounts"]}
        onBack={vi.fn()}
        onEdit={vi.fn()}
        onFinish={vi.fn()}
        summary={deriveOnboardingSummary({
          ...INITIAL_VALUES,
          incomeMode: "net",
          monthlyTakeHome: 3000,
          taxRegion: "WALES",
        })}
        values={{ ...INITIAL_VALUES, incomeMode: "net", monthlyTakeHome: 3000, taxRegion: "WALES" }}
      />,
    );
    expect(container.querySelectorAll("[data-tone='hero']")).toHaveLength(0);
    expect(screen.getByText("Monthly take-home pay (estimate)")).toBeDefined();
    expect(container.textContent).toContain("£3,000");
    // One figure on the review: no left over or net worth beside the take-home.
    expect(container.textContent).not.toMatch(/surplus|left over each month|net worth/i);
    expect(screen.getByText("Wales")).toBeDefined();
  });

  it("enables Finish when income and region are present", () => {
    const { onFinish } = setup({ grossSalary: 45000, taxRegion: "ENGLAND" });
    const finish = screen.getByRole("button", {
      name: /finish and open dashboard/i,
    }) as HTMLButtonElement;
    expect(finish.disabled).toBe(false);
    fireEvent.click(finish);
    expect(onFinish).toHaveBeenCalled();
    expect(screen.queryByTestId("finish-income-hint")).toBeNull();
  });

  it("names what is missing, links back and disables Finish", () => {
    const { onEdit } = setup({});
    const finish = screen.getByRole("button", {
      name: /finish and open dashboard/i,
    }) as HTMLButtonElement;
    const hint = screen.getByTestId("finish-income-hint");
    expect(finish.disabled).toBe(true);
    expect(finish.getAttribute("aria-describedby")).toBe(hint.id);
    expect(hint.textContent).toMatch(/enter your income and choose where you pay tax/i);
    fireEvent.click(screen.getByRole("button", { name: /^Edit you and income$/ }));
    expect(onEdit).toHaveBeenCalledWith(1);
  });

  it("lists only what was entered: no Not set or Not applicable rows", () => {
    setup({ grossSalary: 45000, taxRegion: "ENGLAND" });
    expect(document.body.textContent).not.toMatch(/Not set|Not applicable/);
    expect(screen.queryByText("Age", { selector: "dt" })).toBeNull();
    expect(screen.queryByText("Housing", { selector: "dt" })).toBeNull();
    expect(screen.getAllByText("Nothing added yet.")).toHaveLength(2);
  });

  it("calls the modules list Sections we have set up for you", () => {
    setup({ grossSalary: 45000, taxRegion: "ENGLAND" });
    expect(screen.getByRole("list", { name: "Sections we have set up for you" })).toBeDefined();
    expect(screen.queryByText(/modules switched on/i)).toBeNull();
  });

  it("edit buttons jump to their step", () => {
    const { onEdit } = setup({});
    fireEvent.click(screen.getByRole("button", { name: "Edit Housing and spending" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Savings and debt" }));
    expect(onEdit).toHaveBeenNthCalledWith(1, 2);
    expect(onEdit).toHaveBeenNthCalledWith(2, 3);
  });

  it("describes the current save state without claiming an account save", () => {
    setup({});
    expect(screen.getByTestId("onboarding-saved-note").textContent).toBe(SAVED_NOTES.idle);
  });

  it("says some details are saved after a partial save", () => {
    setup({ grossSalary: 45000, taxRegion: "ENGLAND" }, { saveState: "partial" });
    const note = screen.getByTestId("onboarding-saved-note").textContent ?? "";
    expect(note).toBe(
      'Some of your details are saved. Select "Finish and open dashboard" again to save the rest.',
    );
    expect(note).not.toMatch(/nothing is saved/i);
  });

  it("does not claim nothing is saved after an unconfirmed attempt", () => {
    setup({ grossSalary: 45000, taxRegion: "ENGLAND" }, { saveState: "unconfirmed" });
    expect(screen.getByTestId("onboarding-saved-note").textContent).not.toMatch(
      /nothing is saved/i,
    );
  });

  it("repeats the finish error beside the Finish button", () => {
    setup({ grossSalary: 45000, taxRegion: "ENGLAND" }, { error: "Could not save" });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Could not save");
    const finish = screen.getByRole("button", { name: /finish and open dashboard/i });
    expect(finish.getAttribute("aria-describedby")).toBe(
      "onboarding-finish-error onboarding-saved-note",
    );
  });

  it("keeps Finish focusable while saving and ignores clicks", () => {
    const { onFinish } = setup(
      { grossSalary: 45000, taxRegion: "ENGLAND" },
      { isSubmitting: true },
    );
    const finish = screen.getByRole("button", { name: /^saving/i }) as HTMLButtonElement;
    expect(finish.disabled).toBe(false);
    expect(finish.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(finish);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("uses the missing-fields handler for Edit you and income when given", () => {
    const onFixMissing = vi.fn();
    const { onEdit } = setup({}, { onFixMissing });
    fireEvent.click(screen.getByRole("button", { name: /^Edit you and income$/ }));
    expect(onFixMissing).toHaveBeenCalled();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("lists the answers given and leaves out the empty ones", () => {
    setup({ grossSalary: 45000, taxRegion: "ENGLAND", housingStatus: "mortgage" });
    expect(rowValue("How you earn")).toBe("Employed");
    expect(rowValue("Student loan plan")).toBe("None");
    expect(rowValue("Housing")).toBe("Paying a mortgage");
    expect(screen.queryByText("Pension contribution", { selector: "dt" })).toBeNull();
    expect(screen.queryByText("What your home is worth", { selector: "dt" })).toBeNull();
    expect(screen.queryByText("Mortgage left to pay", { selector: "dt" })).toBeNull();
  });

  it("labels each housing answer's amount and shows no rent row for other answers", () => {
    setup({
      grossSalary: 45000,
      taxRegion: "ENGLAND",
      housingStatus: "living_with_family",
      monthlyHousingCost: 0,
      monthlyOtherOutgoings: 600,
    });
    expect(rowValue("Housing")).toBe("Living with family or friends");
    expect(rowValue("What you pay each month")).toBe("£0 a month");
    expect(rowValue("Other monthly spending")).toBe("£600 a month");
    expect(screen.queryByText("Monthly rent", { selector: "dt" })).toBeNull();
  });

  it("shows no housing cost row when owning with no mortgage", () => {
    setup({
      grossSalary: 45000,
      taxRegion: "ENGLAND",
      housingStatus: "own_outright",
      monthlyHousingCost: 900,
    });
    expect(rowValue("Housing")).toBe("Own with no mortgage");
    expect(screen.queryByText("Monthly rent", { selector: "dt" })).toBeNull();
  });

  it("formats the pension contribution and housing figures", () => {
    setup({
      grossSalary: 45000,
      taxRegion: "ENGLAND",
      housingStatus: "mortgage",
      propertyValue: 300000,
      mortgageBalance: 200000,
      pensionPercent: 5,
      studentLoanPlan: "PLAN_2",
      employmentType: "self-employed",
    });
    expect(rowValue("Pension contribution")).toBe("5%");
    expect(rowValue("What your home is worth")).toBe("£300,000");
    expect(rowValue("Mortgage left to pay")).toBe("£200,000");
    expect(rowValue("Student loan plan")).toBe("Plan 2");
    expect(rowValue("How you earn")).toBe("Self-employed");
  });

  it("leaves out an age that cannot be saved", () => {
    setup({ grossSalary: 45000, taxRegion: "ENGLAND", age: 12 });
    expect(screen.queryByText("Age", { selector: "dt" })).toBeNull();
  });

  it("states the region assumption on the take-home when no region is chosen", () => {
    const { container } = render(
      <FinishSummary
        isSubmitting={false}
        modules={[]}
        onBack={vi.fn()}
        onEdit={vi.fn()}
        onFinish={vi.fn()}
        summary={deriveOnboardingSummary({ ...INITIAL_VALUES, grossSalary: 45000 })}
        values={{ ...INITIAL_VALUES, grossSalary: 45000 }}
      />,
    );
    expect(container.textContent).toContain(REGION_ASSUMPTION_LABEL);
  });
});
