import { fireEvent } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import customRender from "~/testUtils/customRender";
import { StudentLoanOverpayTool } from "./StudentLoanOverpayTool";

describe("<StudentLoanOverpayTool />", () => {
  test("renders student loan evaluator and allows switching plans", () => {
    const { getByText, getAllByText, getByRole, getByLabelText } = customRender(
      <StudentLoanOverpayTool />,
    );

    expect(getByRole("heading", { name: /UK student loan repayment calculator/i })).toBeDefined();
    expect(getByText(/Estimated outcome/i)).toBeDefined();
    expect(getAllByText(/Estimated repayment a month/i)).toBeDefined();

    // Select different plan
    const select = document.querySelector("select") as HTMLSelectElement;
    expect(select).toBeDefined();
    fireEvent.change(select, { target: { value: "plan1" } });

    // Change salary and balance
    const salary = getByLabelText("Yearly salary before tax") as HTMLInputElement;
    fireEvent.change(salary, { target: { value: "65000" } });
    expect(salary.value).toBe("65000");

    const balance = getByLabelText("Student loan balance") as HTMLInputElement;
    fireEvent.change(balance, { target: { value: "15000" } });
    expect(balance.value).toBe("15000");
  });
});
