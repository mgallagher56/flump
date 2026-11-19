import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BtlOverview } from "./BtlOverview";

describe("<BtlOverview />", () => {
  it("lists the rental properties from Accounts and counts them", () => {
    const onManage = vi.fn();
    render(
      <BtlOverview
        properties={[
          { id: "r1", name: "Flat 2" },
          { id: "r2", name: "Harbour Street" },
        ]}
        onManage={onManage}
      />,
    );
    expect(screen.getByText("Your buy to let properties")).toBeDefined();
    expect(screen.getByText("2 properties")).toBeDefined();
    const list = screen.getByRole("list", { name: "Rental properties" });
    expect(list.textContent).toContain("Flat 2");
    expect(list.textContent).toContain("Harbour Street");
    fireEvent.click(screen.getByRole("button", { name: "Edit on Accounts" }));
    expect(onManage).toHaveBeenCalled();
  });

  it("shows each property's gross yield from the rent linked to it", () => {
    // 1,150 a month for the year (13,800) against a value of 230,000: 6.0%.
    render(
      <BtlOverview
        properties={[{ id: "r1", name: "Flat 2", yieldPct: (13800 / 230000) * 100 }]}
        onManage={vi.fn()}
      />,
    );
    const list = screen.getByRole("list", { name: "Rental properties" });
    expect(list.textContent).toContain("Gross yield 6.0%");
    expect(list.textContent).not.toContain("Add rent in Self Assessment");
  });

  it("says how to see a yield when no rent is linked to the property", () => {
    const { container } = render(
      <BtlOverview
        properties={[{ id: "r1", name: "Flat 2", yieldPct: null }]}
        onManage={vi.fn()}
      />,
    );
    expect(screen.getByText("1 property")).toBeDefined();
    expect(container.textContent).toContain(
      "Add rent in Self Assessment, linked to this property, to see its yield.",
    );
    expect(container.textContent).not.toMatch(/Section 24/);
  });

  it("says when no rental property is saved yet", () => {
    render(<BtlOverview properties={[]} onManage={vi.fn()} />);
    expect(screen.getByText("No rental property saved on Accounts yet")).toBeDefined();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("puts the header's Edit action under the text below sm (RC-11, P62)", () => {
    render(<BtlOverview properties={[{ id: "r1", name: "Flat 2" }]} onManage={vi.fn()} />);
    const section = document.getElementById("btl-overview") as HTMLElement;
    expect(section.className).toContain("flex-wrap_wrap");
    expect(section.className).toContain("flex-wrap_nowrap");
  });
});
