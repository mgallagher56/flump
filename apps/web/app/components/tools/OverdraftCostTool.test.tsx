import { fireEvent } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import customRender from "~/testUtils/customRender";
import { OverdraftCostTool } from "./OverdraftCostTool";

describe("<OverdraftCostTool />", () => {
  test("renders overdraft cost calculator with inputs and results", () => {
    const { getByText, getByDisplayValue } = customRender(<OverdraftCostTool />);

    expect(getByText(/Arranged overdraft cost calculator/i)).toBeDefined();
    expect(getByText(/Estimated interest a year/i)).toBeDefined();

    // Verify inputs can be updated
    const balanceInput = getByDisplayValue("1200");
    fireEvent.change(balanceInput, { target: { value: "2000" } });
    expect(getByDisplayValue("2000")).toBeDefined();

    const rateInput = getByDisplayValue("39.9");
    fireEvent.change(rateInput, { target: { value: "19.9" } });
    expect(getByDisplayValue("19.9")).toBeDefined();
  });
});
