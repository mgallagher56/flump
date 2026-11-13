import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextInput } from "../TextInput/TextInput";
import { controlProps, FormField } from "./FormField";

const renderField = (props: Partial<Parameters<typeof FormField>[0]> = {}) =>
  render(
    <FormField label="Monthly overpayment" {...props}>
      {(field) => <TextInput {...controlProps(field)} />}
    </FormField>,
  );

describe("FormField", () => {
  it("associates the label with the control", () => {
    renderField();
    const input = screen.getByLabelText("Monthly overpayment");
    expect(input.tagName).toBe("INPUT");
  });

  it("has no description, invalid state or alert by default", () => {
    renderField();
    const input = screen.getByLabelText("Monthly overpayment");
    expect(input.getAttribute("aria-describedby")).toBeNull();
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("describes the control with the hint", () => {
    renderField({ hint: "Whole pounds, per month" });
    const input = screen.getByLabelText("Monthly overpayment");
    const hint = screen.getByText("Whole pounds, per month");
    expect(input.getAttribute("aria-describedby")).toBe(hint.id);
  });

  it("announces the error with role alert and marks the control invalid", () => {
    renderField({ error: "Enter an amount of £0 or more" });
    const input = screen.getByLabelText("Monthly overpayment");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Enter an amount of £0 or more");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
  });

  it("references both hint and error in aria-describedby", () => {
    renderField({ hint: "Per month", error: "Too high" });
    const input = screen.getByLabelText("Monthly overpayment");
    const ids = (input.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[0] ?? "")?.textContent).toBe("Per month");
    expect(document.getElementById(ids[1] ?? "")?.textContent).toContain("Too high");
  });

  it("shows a required marker that is not read twice", () => {
    const { container } = renderField({ required: true });
    expect(container.querySelector("[aria-hidden='true']")?.textContent).toBe("Required");
    const input = screen.getByRole("textbox", { name: "Monthly overpayment" });
    expect(input.hasAttribute("required")).toBe(true);
    expect(screen.queryByText(/\(required\)/)).toBeNull();
  });

  it("honours an explicit id and generates unique ids otherwise", () => {
    const { container } = renderField({ id: "overpayment" });
    expect(container.querySelector("input#overpayment")).not.toBeNull();
    const second = render(
      <>
        <FormField label="A">{(f) => <TextInput {...controlProps(f)} />}</FormField>
        <FormField label="B">{(f) => <TextInput {...controlProps(f)} />}</FormField>
      </>,
    );
    const ids = Array.from(second.container.querySelectorAll("input")).map((i) => i.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("pairs id and data-testid on the root and strips colons from generated ids", () => {
    const { container } = renderField();
    const root = container.firstElementChild;
    expect(root?.id).toMatch(/-field$/);
    expect(root?.getAttribute("data-testid")).toBe(root?.id);
    expect(screen.getByLabelText("Monthly overpayment").id).not.toContain(":");
  });

  it("keeps the control focusable by label click order (keyboard reachable)", () => {
    renderField();
    const input = screen.getByLabelText("Monthly overpayment");
    input.focus();
    expect(document.activeElement).toBe(input);
  });
});
