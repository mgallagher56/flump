import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { controlProps, FormField } from "../FormField/FormField";
import { Select } from "./Select";

const options = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "yearly", label: "Yearly", disabled: true },
];

describe("Select", () => {
  it("renders a native combobox with options and a placeholder", () => {
    render(<Select aria-label="Frequency" options={options} placeholder="Choose one" />);
    const select = screen.getByRole("combobox", { name: "Frequency" });
    expect(select.tagName).toBe("SELECT");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Choose one",
      "Monthly",
      "Weekly",
      "Yearly",
    ]);
    expect((screen.getByRole("option", { name: "Yearly" }) as HTMLOptionElement).disabled).toBe(
      true,
    );
  });

  it("calls onChange with the chosen value", () => {
    const onChange = vi.fn();
    render(<Select aria-label="Frequency" onChange={onChange} options={options} />);
    fireEvent.change(screen.getByLabelText("Frequency"), { target: { value: "weekly" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText("Frequency") as HTMLSelectElement).value).toBe("weekly");
  });

  it("marks invalid and supports disabled", () => {
    render(<Select aria-label="Frequency" disabled invalid options={options} />);
    const select = screen.getByLabelText("Frequency") as HTMLSelectElement;
    expect(select.getAttribute("aria-invalid")).toBe("true");
    expect(select.disabled).toBe(true);
  });

  it("is labelled and error-associated inside FormField", () => {
    render(
      <FormField
        error="Choose how often you are paid"
        hint="Used for your budget"
        label="Pay cycle"
      >
        {(field) => <Select {...controlProps(field)} options={options} placeholder="Choose one" />}
      </FormField>,
    );
    const select = screen.getByRole("combobox", { name: "Pay cycle" });
    expect(select.getAttribute("aria-invalid")).toBe("true");
    expect(select.getAttribute("aria-describedby")?.split(" ")).toHaveLength(2);
  });

  it("accepts option children", () => {
    render(
      <Select aria-label="Account">
        <option value="a">Joint</option>
      </Select>,
    );
    expect(screen.getByRole("option", { name: "Joint" })).toBeTruthy();
  });
});
