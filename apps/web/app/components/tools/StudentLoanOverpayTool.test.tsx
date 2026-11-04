import { fireEvent } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import customRender from "~/testUtils/customRender";
import { StudentLoanOverpayTool } from "./StudentLoanOverpayTool";

describe("<StudentLoanOverpayTool />", () => {
  test("renders student loan evaluator and allows switching plans", () => {
    const { getByText, getByRole, getByDisplayValue } = customRender(<StudentLoanOverpayTool />);

    expect(getByRole("heading", { name: /UK Student Loan/i })).toBeDefined();
    expect(getByText(/Verdict:/i)).toBeDefined();
    expect(getByText(/Graduate Tax Reality Check/i)).toBeDefined();

    // Select different plan
    const select = document.querySelector("select") as HTMLSelectElement;
    expect(select).toBeDefined();
    fireEvent.change(select, { target: { value: "plan1" } });

    // Change salary and balance
    const salaryInput = getByDisplayValue("38000");
    fireEvent.change(salaryInput, { target: { value: "65000" } });
    expect(getByDisplayValue("65000")).toBeDefined();

    const balanceInput = getByDisplayValue("45000");
    fireEvent.change(balanceInput, { target: { value: "15000" } });
    expect(getByDisplayValue("15000")).toBeDefined();
  });
});
