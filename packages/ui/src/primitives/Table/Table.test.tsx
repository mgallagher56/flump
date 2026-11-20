import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Table, TBody, Td, THead, Th, Tr } from "./Table";

describe("Table Primitive", () => {
  it("renders financial table with headers and tabular rows", () => {
    render(
      <Table>
        <THead>
          <tr>
            <Th>Account</Th>
            <Th numeric>Balance</Th>
          </tr>
        </THead>
        <TBody>
          <tr>
            <Td>Vanguard LifeStrategy 80%</Td>
            <Td numeric>£34,850</Td>
          </tr>
        </TBody>
      </Table>,
    );

    expect(screen.getByText("Account")).toBeDefined();
    expect(screen.getByText("£34,850")).toBeDefined();
  });

  it("defaults Th scope to col inside THead", () => {
    render(
      <Table>
        <THead>
          <tr>
            <Th>Account</Th>
          </tr>
        </THead>
      </Table>,
    );
    expect(screen.getByRole("columnheader", { name: "Account" }).getAttribute("scope")).toBe("col");
  });

  it("lets row headers pass scope=row explicitly and leaves Th outside THead unscoped", () => {
    render(
      <Table>
        <THead>
          <tr>
            <Th scope="row">Explicit</Th>
          </tr>
        </THead>
        <TBody>
          <tr>
            <Th scope="row">Vanguard</Th>
            <Th>Loose</Th>
          </tr>
        </TBody>
      </Table>,
    );
    expect(screen.getByText("Explicit").getAttribute("scope")).toBe("row");
    expect(screen.getByRole("rowheader", { name: "Vanguard" }).getAttribute("scope")).toBe("row");
    expect(screen.getByText("Loose").hasAttribute("scope")).toBe(false);
  });

  it("renders an optional visually hidden caption as the first child of the table", () => {
    render(
      <Table caption="Debts by APR">
        <THead>
          <tr>
            <Th>Debt</Th>
          </tr>
        </THead>
      </Table>,
    );
    const table = screen.getByRole("table", { name: "Debts by APR" });
    const caption = table.firstElementChild;
    expect(caption?.tagName).toBe("CAPTION");
    expect(caption?.textContent).toBe("Debts by APR");
  });

  it("draws the caption when showCaption is set", () => {
    render(
      <Table caption="Debts by APR" showCaption>
        <TBody />
      </Table>,
    );
    const caption = screen.getByText("Debts by APR");
    expect(caption.tagName).toBe("CAPTION");
    expect(screen.getByRole("table", { name: "Debts by APR" })).toBeDefined();
  });

  it("renders no caption when none is given", () => {
    const { container } = render(
      <Table>
        <TBody />
      </Table>,
    );
    expect(container.querySelector("caption")).toBeNull();
  });

  it("aligns numeric and explicitly aligned cells without inline styles", () => {
    const { container } = render(
      <Table>
        <THead>
          <tr>
            <Th numeric>Balance</Th>
            <Th align="center">Status</Th>
          </tr>
        </THead>
        <TBody>
          <tr>
            <Td numeric>£1</Td>
            <Td align="center">Ok</Td>
            <Td>Left</Td>
          </tr>
        </TBody>
      </Table>,
    );
    expect(container.querySelector("[style]")).toBeNull();
    expect(screen.getByText("Balance").className).toContain("ta_end");
    expect(screen.getByText("Status").className).toContain("ta_center");
    expect(screen.getByText("£1").className).toContain("ta_end");
    expect(screen.getByText("£1").className).toContain("tabular-nums");
    expect(screen.getByText("Left").className).toContain("ta_start");
  });

  it("renders a two-line cell with a muted secondary line", () => {
    render(
      <Table>
        <TBody>
          <tr>
            <Td secondary="Current account">Monzo Joint</Td>
          </tr>
        </TBody>
      </Table>,
    );
    expect(screen.getByText("Monzo Joint")).toBeDefined();
    expect(screen.getByText("Current account")).toBeDefined();
  });

  it("exposes the stacked label on cells as data-label", () => {
    render(
      <Table>
        <TBody>
          <tr>
            <Td label="Balance" numeric>
              £1
            </Td>
            <Td>No label</Td>
          </tr>
        </TBody>
      </Table>,
    );
    expect(screen.getByText("£1").getAttribute("data-label")).toBe("Balance");
    expect(screen.getByText("No label").hasAttribute("data-label")).toBe(false);
  });

  it("adds no ARIA roles when not stacked, and Tr renders a plain row", () => {
    render(
      <Table caption="Plain">
        <THead>
          <Tr>
            <Th>A</Th>
          </Tr>
        </THead>
        <TBody>
          <Tr>
            <Td>1</Td>
          </Tr>
        </TBody>
      </Table>,
    );
    const table = screen.getByRole("table", { name: "Plain" });
    expect(table.hasAttribute("role")).toBe(false);
    expect(table.querySelector("[role]")).toBeNull();
  });

  it("adds explicit table, rowgroup, row, columnheader, rowheader and cell roles when stacked", () => {
    const { container } = render(
      <Table caption="Stacked" stacked>
        <THead>
          <Tr>
            <Th>Account</Th>
            <Th numeric>Balance</Th>
          </Tr>
        </THead>
        <TBody>
          <Tr>
            <Th scope="row">Monzo</Th>
            <Td label="Balance" numeric>
              £1
            </Td>
          </Tr>
        </TBody>
      </Table>,
    );
    expect(container.querySelector("table")?.getAttribute("role")).toBe("table");
    expect(container.querySelector("thead")?.getAttribute("role")).toBe("rowgroup");
    expect(container.querySelector("tbody")?.getAttribute("role")).toBe("rowgroup");
    expect(container.querySelectorAll("tr[role=row]")).toHaveLength(2);
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getByRole("rowheader", { name: "Monzo" })).toBeDefined();
    expect(screen.getByRole("cell", { name: "£1" })).toBeDefined();
  });

  it("warns in dev when a stacked body Td after the first has no label", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Table stacked>
        <TBody>
          <Tr>
            <Td>Title, no label needed</Td>
            <Td numeric>£1</Td>
          </Tr>
        </TBody>
      </Table>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("does not warn when every later Td is labelled, or when not stacked", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Table stacked>
        <TBody>
          <Tr>
            <Td>Title</Td>
            <Td label="Balance">£1</Td>
          </Tr>
        </TBody>
      </Table>,
    );
    render(
      <Table>
        <TBody>
          <Tr>
            <Td>Title</Td>
            <Td>£1</Td>
          </Tr>
        </TBody>
      </Table>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("keeps the original bordered card by default and drops it for the soft appearance", () => {
    const { container, rerender } = render(
      <Table>
        <TBody />
      </Table>,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain("bd-w_1px");
    rerender(
      <Table appearance="soft">
        <TBody />
      </Table>,
    );
    expect((container.firstElementChild as HTMLElement).className).not.toContain("bd-w_1px");
  });

  it("makes the wrapper a focusable, labelled region only when the table overflows sideways", () => {
    const widths = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(800);
    const client = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
    const { container, unmount } = render(
      <Table caption="Estimated figures">
        <TBody>
          <Tr>
            <Td>£1</Td>
          </Tr>
        </TBody>
      </Table>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute("tabindex")).toBe("0");
    expect(wrapper.getAttribute("role")).toBe("region");
    expect(wrapper.getAttribute("aria-label")).toBe("Estimated figures");
    unmount();
    widths.mockReturnValue(300);
    const { container: fits } = render(
      <Table caption="Estimated figures">
        <TBody>
          <Tr>
            <Td>£1</Td>
          </Tr>
        </TBody>
      </Table>,
    );
    expect((fits.firstElementChild as HTMLElement).hasAttribute("tabindex")).toBe(false);
    widths.mockRestore();
    client.mockRestore();
  });

  it("keeps tabular figures by default and lets a `text` cell opt out for its hyphen (R2-8)", () => {
    // Inter's tnum widens "-" (7.4px to 10.4px at 16px), so "Self-employed" read "Self - employed".
    const { container } = render(
      <Table>
        <THead>
          <tr>
            <Th text>Employment</Th>
            <Th>Year</Th>
            <Th numeric>Income</Th>
          </tr>
        </THead>
        <TBody>
          <tr>
            <Td text>Self-employed</Td>
            <Td>2026/27</Td>
            <Td numeric>£1,234</Td>
          </tr>
        </TBody>
      </Table>,
    );
    expect(container.querySelector("table")?.className).toContain("tabular-nums");
    // A default cell inherits the table's tabular figures and does not reset them.
    expect(screen.getByText("2026/27").className).not.toContain("fv-num_normal");
    expect(screen.getByText("Year").className).not.toContain("fv-num_normal");
    expect(screen.getByText("Self-employed").className).toContain("fv-num_normal");
    expect(screen.getByText("Employment").className).toContain("fv-num_normal");
    expect(screen.getByText("£1,234").className).toContain("tabular-nums");
  });

  it("leaves aria-sort off headers that cannot sort", () => {
    render(
      <Table>
        <THead>
          <tr>
            <Th sortDirection="asc">Record</Th>
          </tr>
        </THead>
      </Table>,
    );
    expect(screen.getByRole("columnheader", { name: "Record" }).hasAttribute("aria-sort")).toBe(
      false,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("supports sortable column headers with aria-sort and click handler", () => {
    const onSort = vi.fn();
    render(
      <Table>
        <THead>
          <tr>
            <Th sortDirection="asc" onSort={onSort}>
              Record
            </Th>
            <Th numeric sortDirection="none" onSort={vi.fn()}>
              Amount
            </Th>
          </tr>
        </THead>
      </Table>,
    );
    const recordHeader = screen.getByRole("columnheader", { name: /Record/ });
    expect(recordHeader.getAttribute("aria-sort")).toBe("ascending");
    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    expect(onSort).toHaveBeenCalledTimes(1);

    // An unsorted sortable column says "none"; the sort control is a native button, so Enter and
    // Space work from the keyboard.
    const amountHeader = screen.getByRole("columnheader", { name: /Amount/ });
    expect(amountHeader.getAttribute("aria-sort")).toBeNull();
    const amountButton = screen.getByRole("button", { name: "Amount" });
    expect(amountButton.tagName).toBe("BUTTON");
    expect(amountButton.getAttribute("type")).toBe("button");
  });

  it("keeps only the caller's class on a bare header, with the sort button and aria-sort", () => {
    render(
      <table>
        <thead>
          <tr>
            <Th bare className="feature-header" sortDirection="desc" onSort={vi.fn()}>
              Age
            </Th>
          </tr>
        </thead>
      </table>,
    );
    const header = screen.getByRole("columnheader", { name: /Age/ });
    expect(header.className).toBe("feature-header");
    expect(header.getAttribute("aria-sort")).toBe("descending");
    expect(screen.getByRole("button", { name: "Age" })).toBeDefined();
  });
});

describe("Table sideways overflow", () => {
  const renderTable = () =>
    render(
      <Table caption="Estimated figures">
        <TBody>
          <Tr>
            <Td>£1</Td>
          </Tr>
        </TBody>
      </Table>,
    );

  it("treats one pixel of rounding as fitting and two as overflowing", () => {
    const client = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
    const widths = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(301);
    try {
      const fits = renderTable();
      expect((fits.container.firstElementChild as HTMLElement).hasAttribute("role")).toBe(false);
      fits.unmount();
      widths.mockReturnValue(302);
      const { container } = renderTable();
      expect((container.firstElementChild as HTMLElement).getAttribute("role")).toBe("region");
    } finally {
      widths.mockRestore();
      client.mockRestore();
    }
  });

  it("measures again when the wrapper or the table resizes, and stops when unmounted", () => {
    const observers: { callback: () => void; observed: Element[]; disconnect: () => void }[] = [];
    class StubResizeObserver {
      observed: Element[] = [];
      disconnect = vi.fn();
      constructor(public callback: () => void) {
        observers.push(this);
      }
      observe(el: Element) {
        this.observed.push(el);
      }
      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", StubResizeObserver);
    const client = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
    const widths = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(300);
    try {
      const { container, unmount } = renderTable();
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.hasAttribute("role")).toBe(false);
      const observer = observers[0];
      expect(observer?.observed).toEqual([wrapper, wrapper.firstElementChild]);
      widths.mockReturnValue(800);
      act(() => observer?.callback());
      expect(wrapper.getAttribute("role")).toBe("region");
      unmount();
      expect(observer?.disconnect).toHaveBeenCalled();
    } finally {
      widths.mockRestore();
      client.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
