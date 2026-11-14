import { fireEvent } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import customRender from "~/testUtils/customRender";
import { ZeroPercentCliffTool } from "./ZeroPercentCliffTool";

describe("<ZeroPercentCliffTool />", () => {
  test("renders 0% cliff calculator and updates fields", () => {
    const { getByText, getByDisplayValue } = customRender(<ZeroPercentCliffTool />);

    expect(getByText(/0% balance transfer promotional expiry calculator/i)).toBeDefined();
    expect(getByText(/Target monthly payment/i)).toBeDefined();
    expect(getByText(/If you pay only the minimum/i)).toBeDefined();

    // Update inputs
    const balanceInput = getByDisplayValue("3600");
    fireEvent.change(balanceInput, { target: { value: "5000" } });
    expect(getByDisplayValue("5000")).toBeDefined();

    const monthsInput = getByDisplayValue("18");
    fireEvent.change(monthsInput, { target: { value: "12" } });
    expect(getByDisplayValue("12")).toBeDefined();

    const aprInput = getByDisplayValue("24.9");
    fireEvent.change(aprInput, { target: { value: "29.9" } });
    expect(getByDisplayValue("29.9")).toBeDefined();
  });
});
