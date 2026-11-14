import { render, screen } from "@testing-library/react";
import { Fragment } from "react";
import { describe, expect, it, vi } from "vitest";
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { countUnsetKpis, KpiStrip } from "./KpiStrip";

describe("KpiStrip Pattern", () => {
  it("renders children in horizontal grid", () => {
    render(
      <KpiStrip columns={4}>
        <div>Metric A</div>
        <div>Metric B</div>
      </KpiStrip>,
    );
    expect(screen.getByText("Metric A")).toBeDefined();
    expect(screen.getByText("Metric B")).toBeDefined();
  });

  it("uses compact density", () => {
    const { container } = render(
      <KpiStrip>
        <div>Metric A</div>
      </KpiStrip>,
    );
    expect(container.firstElementChild?.getAttribute("data-density")).toBe("compact");
  });

  it.each([1, 2, 3, 4] as const)("supports %i columns", (columns) => {
    const { container } = render(
      <KpiStrip columns={columns}>
        <div>Metric</div>
      </KpiStrip>,
    );
    expect(container.firstElementChild?.className).toContain("grid-tc_");
  });

  it("renders every child even when there are more than four", () => {
    render(
      <KpiStrip columns={4}>
        {["A", "B", "C", "D", "E"].map((n) => (
          <div key={n}>Metric {n}</div>
        ))}
      </KpiStrip>,
    );
    expect(screen.getAllByText(/Metric [A-E]/)).toHaveLength(5);
  });

  it("renders an items tuple and sizes columns from its length", () => {
    const { container } = render(
      <KpiStrip items={[<div key="a">One</div>, <div key="b">Two</div>]} />,
    );
    expect(screen.getByText("One")).toBeDefined();
    expect(screen.getByText("Two")).toBeDefined();
    const twoCol = container.firstElementChild?.className;
    const { container: four } = render(
      <KpiStrip items={[<i key="1">1</i>, <i key="2">2</i>, <i key="3">3</i>, <i key="4">4</i>]} />,
    );
    expect(four.firstElementChild?.className).not.toBe(twoCol);
  });

  it("defaults to three columns", () => {
    const { container } = render(
      <KpiStrip>
        <div>A</div>
      </KpiStrip>,
    );
    const { container: three } = render(
      <KpiStrip columns={3}>
        <div>A</div>
      </KpiStrip>,
    );
    expect(container.firstElementChild?.className).toBe(three.firstElementChild?.className);
  });

  const prompt = {
    title: "Add your interest rate and term to see your payment breakdown",
    action: <a href="/edit">Update your details</a>,
  };

  it("replaces the strip with one prompt when half or more cards are unset", () => {
    render(
      <KpiStrip emptyPrompt={prompt}>
        <KpiCard label="Balance" value={182000} />
        <KpiCard label="Rate" value={null} />
      </KpiStrip>,
    );
    expect(screen.getByRole("heading", { name: prompt.title })).toBeDefined();
    expect(screen.getByRole("link", { name: "Update your details" })).toBeDefined();
    expect(screen.queryByText("Balance")).toBeNull();
    expect(screen.queryByText("Not set")).toBeNull();
  });

  it("keeps the cards when fewer than half are unset", () => {
    render(
      <KpiStrip emptyPrompt={prompt}>
        <KpiCard label="Balance" value={182000} />
        <KpiCard label="Payment" value={940} />
        <KpiCard label="Rate" value={null} />
      </KpiStrip>,
    );
    expect(screen.getByText("Balance")).toBeDefined();
    expect(screen.getByText("Not set")).toBeDefined();
    expect(screen.queryByRole("heading", { name: prompt.title })).toBeNull();
  });

  it("does not count loading cards as unset, and reads an explicit unset prop", () => {
    const { rerender } = render(
      <KpiStrip emptyPrompt={prompt}>
        <KpiCard label="Balance" loading />
        <KpiCard label="Rate" value={4.5} />
      </KpiStrip>,
    );
    expect(screen.queryByRole("heading", { name: prompt.title })).toBeNull();
    rerender(
      <KpiStrip
        emptyPrompt={prompt}
        items={[<KpiCard key="a" label="Rate" unset value="Unknown" />, <div key="b">Other</div>]}
      />,
    );
    expect(screen.getByRole("heading", { name: prompt.title })).toBeDefined();
  });

  it("warns in development and keeps the cards when no prompt is given", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <KpiStrip>
        <KpiCard label="Rate" value={null} />
        <KpiCard label="Term" value={null} />
      </KpiStrip>,
    );
    expect(screen.getAllByText("Not set")).toHaveLength(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("emptyPrompt"));
    warn.mockRestore();
  });

  it("counts unset cards", () => {
    expect(
      countUnsetKpis([
        <KpiCard key="a" label="A" value={null} />,
        <KpiCard key="b" label="B" value={1} />,
        <div key="c">C</div>,
      ]),
    ).toEqual({ total: 3, unset: 1 });
  });

  it("looks through Fragments when counting unset cards", () => {
    expect(
      countUnsetKpis(
        <>
          <KpiCard label="A" value={null} />
          <Fragment key="nested">
            <KpiCard label="B" value={null} />
            <KpiCard label="C" value={1} />
          </Fragment>
        </>,
      ),
    ).toEqual({ total: 3, unset: 2 });
  });

  it("gives each empty prompt a unique id by default, and keeps a given one", () => {
    const strip = (id?: string) => (
      <KpiStrip emptyPrompt={{ title: `Add details ${id ?? "x"}`, id }}>
        <KpiCard label="Rate" value={null} />
      </KpiStrip>
    );
    const { container } = render(
      <>
        {strip()}
        {strip()}
        {strip("mine")}
      </>,
    );
    const ids = Array.from(container.querySelectorAll("[data-kpi-strip='empty'] > [id]")).map(
      (el) => el.id,
    );
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    expect(ids).not.toContain("kpi-strip-empty");
    expect(ids[2]).toBe("mine");
  });

  it("stacks 3 cards in one column at phone width, so none is orphaned (2 + 1)", () => {
    const { container } = render(
      <KpiStrip columns={3}>
        <div>A</div>
        <div>B</div>
        <div>C</div>
      </KpiStrip>,
    );
    const cls = container.firstElementChild?.className ?? "";
    expect(cls).toContain("grid-tc_minmax(0,_1fr)");
    expect(cls).toContain("sm:grid-tc_repeat(3,_minmax(0,_1fr))");
    expect(cls).not.toContain("grid-tc_repeat(2");
  });

  it("rejects a fifth item at compile time", () => {
    render(
      <KpiStrip
        // @ts-expect-error a strip holds at most four items
        items={[
          <i key="1">1</i>,
          <i key="2">2</i>,
          <i key="3">3</i>,
          <i key="4">4</i>,
          <i key="5">5</i>,
        ]}
      />,
    );
    expect(screen.getByText("5")).toBeDefined();
  });
});
