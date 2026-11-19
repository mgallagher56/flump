import { ToastProvider } from "@repo/ui";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PROFILE, type UserProfile } from "~/hooks/useUserProfile";
import {
  AGE_AND_PAY_SAVE_FAILED,
  AGE_AND_PAY_SAVED_MESSAGE,
  AgeAndPaySection,
  parseBirthYear,
} from "./AgeAndPaySection";

// The shared setup renders Link as bare children; here it is an anchor so the router path shows.
vi.mock("react-router", async () => {
  const actual: typeof import("react-router") = await vi.importActual("react-router");
  return {
    ...actual,
    Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
      <a data-router-link="true" href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

vi.mock("~/hooks/useUserProfile", async () => {
  const actual: typeof import("~/hooks/useUserProfile") =
    await vi.importActual("~/hooks/useUserProfile");
  return { ...actual, useUserProfile: () => ({ updateProfile: vi.fn() }) };
});

// Midday on 18 November 2026, London.
const NOW = new Date("2026-11-18T12:00:00Z");

const SAVED: UserProfile = {
  ...DEFAULT_PROFILE,
  birthYear: 1986,
  annualSalary: 52000,
  pensionPercent: 6,
  pensionEmployerPercent: 4,
};

const setup = (profile: UserProfile = SAVED, onSave = vi.fn().mockResolvedValue(undefined)) => {
  render(<AgeAndPaySection now={NOW} profile={profile} onSave={onSave} />);
  return {
    onSave,
    year: screen.getByLabelText("Year of birth") as HTMLInputElement,
    salary: screen.getByLabelText("Yearly salary before tax") as HTMLInputElement,
    own: screen.getByLabelText("Your pension contribution (% of salary)") as HTMLInputElement,
    employer: screen.getByLabelText("Employer contribution (% of salary)") as HTMLInputElement,
  };
};

describe("<AgeAndPaySection />", () => {
  it("shows the saved values, the age this year and a link target id", () => {
    const { year, salary, own, employer } = setup();
    expect(year.value).toBe("1986");
    expect(year.getAttribute("inputmode")).toBe("numeric");
    expect(year.getAttribute("autocomplete")).toBe("bday-year");
    expect(salary.value).toBe("52,000");
    expect(own.value).toBe("6");
    expect(employer.value).toBe("4");
    expect(screen.getByText("You turn 40 this year.")).toBeDefined();
    expect(document.getElementById("settings-age-and-pay")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Your pension" }).getAttribute("href")).toBe(
      "/app/pension",
    );
  });

  it("links to the pension page through the router when inside one", () => {
    render(
      <MemoryRouter>
        <AgeAndPaySection now={NOW} profile={SAVED} onSave={vi.fn()} />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Your pension" });
    expect(link.getAttribute("href")).toBe("/app/pension");
    expect(link.getAttribute("data-testid")).toBe("age-and-pay-pension-link");
    expect(link.getAttribute("data-router-link")).toBe("true");
  });

  it("shows the 5% and 3% creation defaults as empty fields marked Not set", () => {
    const { own, employer } = setup({
      ...DEFAULT_PROFILE,
      pensionPercent: 5,
      pensionEmployerPercent: 3,
    });
    expect(own.value).toBe("");
    expect(employer.value).toBe("");
    expect(screen.getAllByText("Not set", { selector: ":not(option)" })).toHaveLength(2);
  });

  it("keeps an unsaved salary and year empty, never 0", () => {
    const { year, salary } = setup({ ...DEFAULT_PROFILE, birthYear: null, annualSalary: null });
    expect(year.value).toBe("");
    expect(salary.value).toBe("");
    expect(screen.queryByText(/You turn/)).toBeNull();
  });

  it("saves the year of birth when the field is left, only if it changed", async () => {
    const { year, onSave } = setup();
    fireEvent.blur(year);
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(year, { target: { value: "1990" } });
    expect(screen.getByText("You turn 36 this year.")).toBeDefined();
    fireEvent.blur(year);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ birthYear: 1990 }));
  });

  it("clears the year of birth to null when emptied", async () => {
    const { year, onSave } = setup();
    fireEvent.change(year, { target: { value: "" } });
    fireEvent.keyDown(year, { key: "Enter" });
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ birthYear: null }));
  });

  it.each(["1899", "2027", "86"])("rejects %s with an error and does not save", (typed) => {
    const { year, onSave } = setup();
    fireEvent.change(year, { target: { value: typed } });
    fireEvent.blur(year);
    expect(screen.getByText("Enter a year between 1900 and 2026.")).toBeDefined();
    expect(year.getAttribute("aria-invalid")).toBe("true");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves the salary on blur", async () => {
    const { salary, onSave } = setup();
    fireEvent.change(salary, { target: { value: "60000" } });
    fireEvent.blur(salary);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ annualSalary: 60000 }));
  });

  it("saves both pension rates together once one is entered, after leaving the pair", async () => {
    const { own, employer, onSave } = setup({
      ...DEFAULT_PROFILE,
      pensionPercent: 5,
      pensionEmployerPercent: 3,
    });
    fireEvent.change(own, { target: { value: "7" } });
    // Moving to the employer field is not leaving the pair.
    fireEvent.blur(own, { relatedTarget: employer });
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.blur(employer);
    // The employer field was left empty while the rates were assumed, so it keeps the saved 3%.
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ pensionPercent: 7, pensionEmployerPercent: 3 }),
    );
    expect(employer.value).toBe("3");
  });

  it("keeps the saved own rate when only the employer rate is typed over assumed rates", async () => {
    const { own, employer, onSave } = setup({
      ...DEFAULT_PROFILE,
      pensionPercent: 5,
      pensionEmployerPercent: 3,
    });
    fireEvent.change(employer, { target: { value: "6" } });
    fireEvent.blur(employer);
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ pensionPercent: 5, pensionEmployerPercent: 6 }),
    );
    expect(own.value).toBe("5");
  });

  it("does not save an emptied rate once the rates are a choice, and shows the saved rate again", () => {
    // Saved 6% and 4%. The rate columns cannot be empty, so emptying the employer field and
    // leaving it saves nothing and puts 4 back.
    const { employer, onSave } = setup();
    fireEvent.change(employer, { target: { value: "" } });
    fireEvent.blur(employer);
    expect(onSave).not.toHaveBeenCalled();
    expect(employer.value).toBe("4");
  });

  it("saves a typed 0 as 0%", async () => {
    const { employer, onSave } = setup();
    fireEvent.change(employer, { target: { value: "0" } });
    fireEvent.blur(employer);
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ pensionPercent: 6, pensionEmployerPercent: 0 }),
    );
  });

  it("shows the pounds a month beside each saved rate", () => {
    setup();
    // £52,000 at 6%: 52,000 × 0.06 = 3,120 a year; ÷ 12 = £260 a month.
    expect(screen.getByText("About £260 a month")).toBeDefined();
    // £52,000 at 4%: 2,080 a year; ÷ 12 = £173.33, shown to the whole pound.
    expect(screen.getByText("About £173 a month")).toBeDefined();
  });

  it("switches the fields to pounds a month without saving, and back", () => {
    const { onSave } = setup();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "£ a month" }));
    fireEvent.click(screen.getByRole("tab", { name: "£ a month" }));
    const own = screen.getByLabelText("Your pension contribution (£ a month)") as HTMLInputElement;
    const employer = screen.getByLabelText("Employer contribution (£ a month)") as HTMLInputElement;
    expect(own.value).toBe("260");
    expect(employer.value).toBe("173.33");
    // The rate now sits beside the pounds.
    expect(screen.getByText("6% of salary")).toBeDefined();
    expect(screen.getByText("4% of salary")).toBeDefined();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "% of salary" }));
    fireEvent.click(screen.getByRole("tab", { name: "% of salary" }));
    expect(
      (screen.getByLabelText("Your pension contribution (% of salary)") as HTMLInputElement).value,
    ).toBe("6");
  });

  it("saves pounds a month as the percentage of the saved salary", async () => {
    const { onSave } = setup();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "£ a month" }));
    fireEvent.click(screen.getByRole("tab", { name: "£ a month" }));
    const own = screen.getByLabelText("Your pension contribution (£ a month)");
    fireEvent.change(own, { target: { value: "300" } });
    fireEvent.blur(own);
    // £300 a month on £52,000: 3,600 ÷ 52,000 = 6.923076...%, stored to four places as 6.9231%.
    // Only the percentage is saved; the employer's 4% is unchanged.
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ pensionPercent: 6.9231, pensionEmployerPercent: 4 }),
    );
  });

  it("round-trips a typed £100 a month to the penny, showing the rate to two places", async () => {
    const { onSave } = setup({ ...SAVED, annualSalary: 37260 });
    fireEvent.mouseDown(screen.getByRole("tab", { name: "£ a month" }));
    fireEvent.click(screen.getByRole("tab", { name: "£ a month" }));
    const own = screen.getByLabelText("Your pension contribution (£ a month)") as HTMLInputElement;
    fireEvent.change(own, { target: { value: "100" } });
    fireEvent.blur(own);
    // £100 a month on £37,260: 1,200 ÷ 37,260 = 3.22061...%, stored as 3.2206%.
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ pensionPercent: 3.2206, pensionEmployerPercent: 4 }),
    );
    // Back from the stored rate: 37,260 × 0.032206 ÷ 12 = £99.9996, shown as £100.
    await waitFor(() => expect(own.value).toBe("100"));
    // The rate itself shows to at most two places.
    expect(screen.getByText("3.22% of salary")).toBeDefined();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "% of salary" }));
    fireEvent.click(screen.getByRole("tab", { name: "% of salary" }));
    expect(
      (screen.getByLabelText("Your pension contribution (% of salary)") as HTMLInputElement).value,
    ).toBe("3.22");
  });

  it("turns off pounds a month without a saved salary and says why", () => {
    setup({ ...SAVED, annualSalary: null });
    const monthly = screen.getByRole("tab", { name: "£ a month" });
    expect(monthly.hasAttribute("disabled") || monthly.getAttribute("data-disabled") !== null).toBe(
      true,
    );
    expect(screen.getByTestId("pension-unit-note").textContent).toBe(
      "Add your salary to enter pounds a month.",
    );
    // No pounds are invented beside the rates.
    expect(screen.queryByText(/^About £/)).toBeNull();
    expect(screen.getByLabelText("Your pension contribution (% of salary)")).toBeDefined();
  });

  it("saves the employment type on change, and Not set as null", async () => {
    const { onSave } = setup({ ...SAVED, employmentType: "employed" });
    const select = screen.getByLabelText("Employment type") as HTMLSelectElement;
    expect(select.value).toBe("employed");
    fireEvent.change(select, { target: { value: "self-employed" } });
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ employmentType: "self-employed" }));
    fireEvent.change(select, { target: { value: "" } });
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith({ employmentType: null }));
  });

  it("raises a Saved toast after a save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <ToastProvider>
        <AgeAndPaySection now={NOW} profile={SAVED} onSave={onSave} />
      </ToastProvider>,
    );
    const year = screen.getByLabelText("Year of birth");
    fireEvent.change(year, { target: { value: "1980" } });
    fireEvent.blur(year);
    expect(await screen.findByText(AGE_AND_PAY_SAVED_MESSAGE)).toBeDefined();
  });

  it("puts the saved value back and says so when a save fails", async () => {
    const { salary } = setup(SAVED, vi.fn().mockRejectedValue(new Error("boom")));
    fireEvent.change(salary, { target: { value: "70000" } });
    fireEvent.blur(salary);
    const alert = await screen.findByTestId("age-and-pay-error");
    expect(alert.getAttribute("role")).toBe("alert");
    expect(alert.textContent).toBe(AGE_AND_PAY_SAVE_FAILED);
    await waitFor(() => expect(salary.value).toBe("52,000"));
  });
});

describe("parseBirthYear", () => {
  it("accepts 1900 to the current year, empty as null, anything else as invalid", () => {
    expect(parseBirthYear("1900", 2026)).toBe(1900);
    expect(parseBirthYear("2026", 2026)).toBe(2026);
    expect(parseBirthYear(" ", 2026)).toBeNull();
    expect(parseBirthYear("1899", 2026)).toBe("invalid");
    expect(parseBirthYear("2027", 2026)).toBe("invalid");
    expect(parseBirthYear("19a0", 2026)).toBe("invalid");
  });
});
