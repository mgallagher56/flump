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
  it("shows one hero headline and the figures", () => {
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
    expect(container.querySelectorAll("[data-tone='hero']")).toHaveLength(1);
    expect(container.textContent).toContain("£3,000");
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
    fireEvent.click(screen.getByRole("button", { name: /go to you and income/i }));
    expect(onEdit).toHaveBeenCalledWith(1);
  });

  it("shows Not set for anything skipped", () => {
    setup({ grossSalary: 45000, taxRegion: "ENGLAND" });
    expect(screen.getAllByText("Not set").length).toBeGreaterThan(3);
  });

  it("edit buttons jump to their step", () => {
    const { onEdit } = setup({});
    fireEvent.click(screen.getByRole("button", { name: "Edit Housing and outgoings" }));
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
    expect(note).toBe("Some details are saved. Finish again to add the rest.");
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

  it("uses the missing-fields handler for Go to You and income when given", () => {
    const onFixMissing = vi.fn();
    const { onEdit } = setup({}, { onFixMissing });
    fireEvent.click(screen.getByRole("button", { name: /go to you and income/i }));
    expect(onFixMissing).toHaveBeenCalled();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("lists every income, housing and savings answer, Not set when empty", () => {
    setup({ grossSalary: 45000, taxRegion: "ENGLAND", housingStatus: "mortgage" });
    expect(rowValue("How you earn")).toBe("Employed");
    expect(rowValue("Student loan plan")).toBe("None");
    expect(rowValue("Pension contribution")).toBe("Not set");
    expect(rowValue("Property value")).toBe("Not set");
    expect(rowValue("Mortgage balance")).toBe("Not set");
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
    expect(rowValue("Property value")).toBe("£300,000");
    expect(rowValue("Mortgage balance")).toBe("£200,000");
    expect(rowValue("Student loan plan")).toBe("Plan 2");
    expect(rowValue("How you earn")).toBe("Self-employed");
  });

  it("shows Not set for an age that cannot be saved", () => {
    setup({ grossSalary: 45000, taxRegion: "ENGLAND", age: 12 });
    expect(rowValue("Age")).toBe("Not set");
  });

  it("states the region assumption on the hero when no region is chosen", () => {
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
