import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FLPCheckbox from "./FLPCheckbox";

const describedText = (el: HTMLElement) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent)
    .join(" ")
    .trim();

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

  it("error describes the checkbox", () => {
    render(<FLPCheckbox error="Field is required" id="err-cb" label="Rich checkbox" />);
    const checkbox = screen.getByRole("checkbox");
    expect(describedText(checkbox)).toBe("Field is required");
    expect(checkbox.getAttribute("aria-invalid")).toBe("true");
  });

  it("error uses danger token and is announced", () => {
    render(<FLPCheckbox error="Field is required" id="err-cb2" label="Rich checkbox" />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Field is required");
    expect(alert.className).toContain("c_status.danger.text");
  });

  it("checked box uses solid fill", () => {
    const { container } = render(<FLPCheckbox defaultChecked id="chk-cb" label="Checked" />);
    const box = container.querySelector("[data-checked='true']") as HTMLElement;
    expect(box.className).toContain("bg-c_primary.solid");
    expect(box.className).toContain("c_primary.foreground");
  });

  it("unchecked box uses the input boundary token", () => {
    const { container } = render(<FLPCheckbox id="unchk-cb" label="Unchecked" />);
    const box = container.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(box.className).toContain("bd-c_border.input");
  });
});
