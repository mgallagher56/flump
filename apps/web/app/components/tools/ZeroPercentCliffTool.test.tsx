import { fireEvent } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import customRender from "~/testUtils/customRender";
import { ZeroPercentCliffTool } from "./ZeroPercentCliffTool";

describe("<ZeroPercentCliffTool />", () => {
  test("renders 0% cliff calculator and updates fields", () => {
    const { getByText, getByLabelText } = customRender(<ZeroPercentCliffTool />);

    expect(getByText(/When a 0% balance transfer ends/i)).toBeDefined();
    expect(getByText(/Estimated monthly payment/i)).toBeDefined();
    expect(getByText(/with minimum payments only/i)).toBeDefined();

    // Update inputs
    const balance = getByLabelText("Balance on the 0% card range slider") as HTMLInputElement;
    fireEvent.change(balance, { target: { value: "5000" } });
    expect(balance.value).toBe("5000");

    const months = getByLabelText("Months left on the 0% deal range slider") as HTMLInputElement;
    fireEvent.change(months, { target: { value: "12" } });
    expect(months.value).toBe("12");

    const apr = getByLabelText(
      "Interest rate after the 0% deal ends (APR) input",
    ) as HTMLInputElement;
    fireEvent.focus(apr);
    fireEvent.change(apr, { target: { value: "29.9" } });
    fireEvent.blur(apr);
    expect(apr.value).toContain("29.9");
  });
});
