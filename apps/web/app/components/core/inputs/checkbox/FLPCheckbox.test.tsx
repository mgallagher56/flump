import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FLPCheckbox from "./FLPCheckbox";

describe("<FLPCheckbox />", () => {
  it("renders with a label and toggles unchecked to checked", async () => {
    const user = userEvent.setup();
    const handleCheckedChange = vi.fn();

    render(
      <FLPCheckbox id="test-checkbox" label="Accept terms" onCheckedChange={handleCheckedChange} />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });
    expect(checkbox).toBeDefined();
    expect((checkbox as HTMLInputElement).checked).toBe(false);

    await user.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect(handleCheckedChange).toHaveBeenCalledWith(true);
  });

  it("supports controlled mode", () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <FLPCheckbox
        checked={false}
        id="controlled-cb"
        label="Controlled checkbox"
        onChange={handleChange}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Controlled checkbox" });
    expect((checkbox as HTMLInputElement).checked).toBe(false);

    rerender(
      <FLPCheckbox
        checked={true}
        id="controlled-cb"
        label="Controlled checkbox"
        onChange={handleChange}
      />,
    );
    expect((checkbox as HTMLInputElement).checked).toBe(true);
  });

  it("handles disabled state properly", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <FLPCheckbox disabled id="disabled-cb" label="Disabled checkbox" onChange={handleChange} />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Disabled checkbox" });
    expect((checkbox as HTMLInputElement).disabled).toBe(true);

    await user.click(checkbox);
    expect(handleChange).not.toHaveBeenCalled();
    expect((checkbox as HTMLInputElement).checked).toBe(false);
  });

  it("renders description and error message if provided", () => {
    render(
      <FLPCheckbox
        description="Helper explanation"
        error="Field is required"
        id="rich-cb"
        label="Rich checkbox"
      />,
    );

    expect(screen.getByText("Helper explanation")).toBeDefined();
    expect(screen.getByText("Field is required")).toBeDefined();
  });
});
