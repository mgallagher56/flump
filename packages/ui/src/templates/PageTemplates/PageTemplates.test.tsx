import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DashboardTemplate,
  EmptyTemplate,
  ErrorTemplate,
  FormTemplate,
  ListDetailTemplate,
  SimulatorTemplate,
} from "./PageTemplates";

describe("PageTemplates", () => {
  it("dashboard shows one h1, a KPI strip, a figure and an accounts table", () => {
    render(<DashboardTemplate />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("figure")).toBeDefined();
    expect(screen.getByRole("table", { name: "Your accounts" })).toBeDefined();
    expect(screen.getAllByText("Net worth").length).toBeGreaterThan(0);
  });

  it("simulator switches strategy", () => {
    render(<SimulatorTemplate />);
    const snowball = screen.getByRole("radio", { name: /Snowball/ }) as HTMLInputElement;
    fireEvent.click(snowball);
    expect(snowball.checked).toBe(true);
  });

  it("form shows the balance error until a value is entered", () => {
    render(<FormTemplate />);
    expect(screen.getByText("Enter a balance, or leave it for later.")).toBeDefined();
    fireEvent.change(screen.getByRole("textbox", { name: /Current balance/ }), {
      target: { value: "1200" },
    });
    fireEvent.blur(screen.getByRole("textbox", { name: /Current balance/ }));
    expect(screen.queryByText("Enter a balance, or leave it for later.")).toBeNull();
  });

  it("list and detail marks the selected account", () => {
    render(<ListDetailTemplate />);
    const pension = screen.getByRole("button", { name: /Workplace pension/ });
    fireEvent.click(pension);
    expect(pension.getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("heading", { level: 2, name: "Workplace pension" })).toBeDefined();
  });

  it("empty and error states each offer one clear action", () => {
    render(<EmptyTemplate />);
    expect(screen.getByRole("button", { name: "Add an account" })).toBeDefined();
    render(<ErrorTemplate />);
    expect(screen.getByRole("button", { name: "Back to home" })).toBeDefined();
  });
});
