import { figureKnown, figureUnknown, type HousingCost } from "@flump/finance-engine";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HousingDetailsCard, RENT_SAVE_ERROR } from "./HousingDetailsCard";

const rent = figureKnown<HousingCost>(
  { kind: "rent", monthly: 900, takeHomeMonthly: 2700, sharePct: 33.3, paymentEstimated: false },
  "user",
);
const unknownRent = figureUnknown<HousingCost>(["monthlyHousingCost"]);

describe("<HousingDetailsCard />", () => {
  it("shows the saved rent as one figure, with no form on the page", () => {
    render(<HousingDetailsCard housingCost={rent} onSaveRent={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Your details" })).toBeDefined();
    expect(screen.getByTestId("housing-details-rent").textContent).toBe("£900");
    expect(screen.queryByLabelText("Rent each month")).toBeNull();
  });

  it("opens the rent form in a dialog and saves it", async () => {
    const onSaveRent = vi.fn().mockResolvedValue(undefined);
    render(<HousingDetailsCard housingCost={unknownRent} onSaveRent={onSaveRent} />);
    expect(screen.getByText("Not set")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Edit your rent" }));
    const input = await screen.findByLabelText("Rent each month");
    expect(input.getAttribute("type")).not.toBe("number");
    fireEvent.change(input, { target: { value: "950" } });
    fireEvent.click(screen.getByRole("button", { name: "Save rent" }));
    await waitFor(() => expect(onSaveRent).toHaveBeenCalledWith(950));
  });

  it("keeps the dialog open with a state line when saving fails", async () => {
    const onSaveRent = vi.fn().mockRejectedValue(new Error("nope"));
    render(<HousingDetailsCard housingCost={rent} savedRent={900} onSaveRent={onSaveRent} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit your rent" }));
    fireEvent.click(await screen.findByRole("button", { name: "Save rent" }));
    expect(await screen.findByText(RENT_SAVE_ERROR)).toBeDefined();
  });
});
