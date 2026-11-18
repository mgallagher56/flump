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
