import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HOUSING_SAVE_ERROR, HousingDetails, housingTenureLabel } from "./HousingDetails";

const saveButton = () => screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;

describe("housingTenureLabel", () => {
  it("names each tenure and nothing when it is not set", () => {
    expect(housingTenureLabel("renting")).toBe("Renting");
    expect(housingTenureLabel("mortgage")).toBe("Mortgage");
    expect(housingTenureLabel("own_outright")).toBe("Own outright");
    expect(housingTenureLabel("living_with_family")).toBe("Living with family or friends");
    expect(housingTenureLabel(null)).toBeUndefined();
  });
});

describe("<HousingDetails />", () => {
  it("renting: no form or figure on the page, rent is edited in a dialog and saved", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<HousingDetails housingStatus="renting" savedAmount={900} onSave={onSave} />);
    expect(screen.getByText(/Your rent is saved in your details/)).toBeDefined();
    expect(screen.queryByLabelText("Rent each month")).toBeNull();
    expect(screen.queryByText("£900")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Edit your rent" }));
    const input = await screen.findByLabelText("Rent each month");
    expect(input.getAttribute("type")).not.toBe("number");
    expect((input as HTMLInputElement).value).toBe("900");
    fireEvent.change(input, { target: { value: "950" } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(950));
    await waitFor(() => expect(screen.queryByLabelText("Rent each month")).toBeNull());
  });

  it("renting: rent must be more than £0", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<HousingDetails housingStatus="renting" savedAmount={900} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit your rent" }));
    fireEvent.change(await screen.findByLabelText("Rent each month"), {
      target: { value: "0" },
    });
    expect(saveButton().disabled).toBe(true);
    fireEvent.click(saveButton());
    expect(onSave).not.toHaveBeenCalled();
  });

  it("living with family: edits what you pay, and £0 is a real answer", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<HousingDetails housingStatus="living_with_family" savedAmount={200} onSave={onSave} />);
    expect(screen.getByText(/You live with family or friends/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Edit what you pay" }));
    const input = await screen.findByLabelText("What you pay each month");
    fireEvent.change(input, { target: { value: "0" } });
    expect(saveButton().disabled).toBe(false);
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(0));
  });

  it("mortgage: points to the mortgage page and offers no form", () => {
    render(<HousingDetails housingStatus="mortgage" savedAmount={1100} onSave={vi.fn()} />);
    expect(screen.getByText("Your mortgage payment is on the mortgage page.")).toBeDefined();
    // The global test setup renders links as their children.
    expect(screen.getByText("Open the mortgage page")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("own outright: renders nothing", () => {
    const { container } = render(
      <HousingDetails housingStatus="own_outright" savedAmount={null} onSave={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("not set: asks to add rent, or to edit it once there is an amount", () => {
    const { rerender } = render(<HousingDetails housingStatus={null} onSave={vi.fn()} />);
    expect(screen.getByText(/Add your rent to your details/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Add your rent" })).toBeDefined();
    rerender(<HousingDetails housingStatus={null} savedAmount={750} onSave={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Edit your rent" })).toBeDefined();
  });

  it("not set: starts empty, so Save waits for an amount", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<HousingDetails housingStatus={null} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Add your rent" }));
    const input = await screen.findByLabelText("Rent each month");
    expect(saveButton().disabled).toBe(true);
    fireEvent.change(input, { target: { value: "800" } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(800));
  });

  it("keeps the dialog open with a state line when saving fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("nope"));
    render(<HousingDetails housingStatus="renting" savedAmount={900} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit your rent" }));
    fireEvent.click(await screen.findByRole("button", { name: "Save" }));
    expect(await screen.findByText(HOUSING_SAVE_ERROR)).toBeDefined();
    expect(screen.getByLabelText("Rent each month")).toBeDefined();
  });
});
