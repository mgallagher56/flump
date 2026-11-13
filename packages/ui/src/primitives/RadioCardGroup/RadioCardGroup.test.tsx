import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RadioCardGroup, type RadioCardOption } from "./RadioCardGroup";

const options: RadioCardOption[] = [
  {
    value: "avalanche",
    label: "Avalanche",
    description: "Highest interest rate first",
    badge: "Saves most interest",
  },
  { value: "snowball", label: "Snowball", description: "Smallest balance first" },
  { value: "custom", label: "Custom", disabled: true },
];

const isChecked = (name: RegExp) =>
  (screen.getByRole("radio", { name }) as HTMLInputElement).checked;

describe("RadioCardGroup", () => {
  it("renders a labelled group of native radios sharing one name", () => {
    render(<RadioCardGroup legend="Payoff strategy" options={options} />);
    expect(screen.getByRole("group", { name: "Payoff strategy" }).tagName).toBe("FIELDSET");
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios).toHaveLength(3);
    expect(new Set(radios.map((r) => r.name)).size).toBe(1);
    expect(radios.every((r) => r.type === "radio")).toBe(true);
  });

  it("describes each radio with its description", () => {
    render(<RadioCardGroup legend="Payoff strategy" options={options} />);
    expect(
      screen.getByRole("radio", { name: /Snowball/, description: "Smallest balance first" }),
    ).toBeTruthy();
  });

  it("selects uncontrolled and reports the value", () => {
    const onValueChange = vi.fn();
    render(
      <RadioCardGroup
        defaultValue="avalanche"
        legend="Payoff strategy"
        onValueChange={onValueChange}
        options={options}
      />,
    );
    expect(isChecked(/Avalanche/)).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /Snowball/ }));
    expect(onValueChange).toHaveBeenCalledWith("snowball");
    expect(isChecked(/Snowball/)).toBe(true);
  });

  it("respects a controlled value", () => {
    render(<RadioCardGroup legend="Payoff strategy" options={options} value="snowball" />);
    fireEvent.click(screen.getByRole("radio", { name: /Avalanche/ }));
    expect(isChecked(/Snowball/)).toBe(true);
  });

  it("disables single options and the whole group", () => {
    const { rerender } = render(<RadioCardGroup legend="Payoff strategy" options={options} />);
    expect((screen.getByRole("radio", { name: /Custom/ }) as HTMLInputElement).disabled).toBe(true);
    rerender(<RadioCardGroup disabled legend="Payoff strategy" options={options} />);
    expect((screen.getByRole("group") as HTMLFieldSetElement).disabled).toBe(true);
    expect((screen.getAllByRole("radio") as HTMLInputElement[]).every((r) => r.disabled)).toBe(
      true,
    );
  });

  it("associates hint and error with the group", () => {
    render(
      <RadioCardGroup
        error="Choose a strategy to continue"
        hint="You can change this later"
        legend="Payoff strategy"
        options={options}
      />,
    );
    const group = screen.getByRole("group", { name: "Payoff strategy" });
    expect(group.getAttribute("aria-describedby")?.split(" ")).toHaveLength(2);
    expect(screen.getByRole("alert").textContent).toContain("Choose a strategy to continue");
  });
});
