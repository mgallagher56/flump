import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ALL_FEATURE_LINES, FEATURE_GROUPS } from "../../utils/featureIndex";
import { FeatureIndex, toggleLine } from "./FeatureIndex";

const detailsOf = (id: string) => {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLDetailsElement)) throw new Error(`No details #${id}`);
  return element;
};

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("FeatureIndex", () => {
  it("renders every group as a labelled section with its lines, all closed at rest", () => {
    render(<FeatureIndex />);
    for (const group of FEATURE_GROUPS) {
      const section = screen.getByRole("region", { name: group.name });
      expect(within(section).getAllByRole("listitem")).toHaveLength(group.lines.length);
    }
    const all = ALL_FEATURE_LINES.map((line) => detailsOf(line.id));
    expect(all).toHaveLength(ALL_FEATURE_LINES.length);
    expect(all.filter((details) => details.open)).toEqual([]);
  });

  it("shows each line's name and short line in its summary, and the detail only inside", () => {
    render(<FeatureIndex />);
    const summary = detailsOf("breathing-room").querySelector("summary");
    expect(summary?.textContent).toBe(
      "Breathing roomFind out how long your savings would cover the essentials",
    );
    const link = within(detailsOf("breathing-room")).getByRole("link", {
      name: "More on the Budget page",
      hidden: true,
    });
    expect(link.getAttribute("href")).toBe("/features/budget#see-it");
  });

  it("opens a line when its summary is clicked and closes it on a second click, natively where it cannot animate", () => {
    // No Web Animations API: the details element toggles itself.
    const animate = HTMLElement.prototype.animate;
    (HTMLElement.prototype as { animate?: unknown }).animate = undefined;
    render(<FeatureIndex />);
    const details = detailsOf("net-worth");
    const summary = details.querySelector("summary") as HTMLElement;
    fireEvent.click(summary);
    expect(details.open).toBe(true);
    fireEvent.click(summary);
    expect(details.open).toBe(false);
    HTMLElement.prototype.animate = animate;
  });

  it("opens a line to its height on time and closes it only when the closing has finished", () => {
    render(<FeatureIndex />);
    const details = detailsOf("net-worth");
    const panel = details.querySelector<HTMLElement>("[data-line-panel]") as HTMLElement;
    const runs: { frames: Keyframe[]; finish: () => void }[] = [];
    panel.animate = ((frames: Keyframe[]) => {
      const run = { frames, finish: () => {}, onfinish: null as null | (() => void) };
      run.finish = () => run.onfinish?.();
      runs.push(run);
      return run as unknown as Animation;
    }) as typeof panel.animate;
    panel.getAnimations = () => [];
    expect(toggleLine(details)).toBe(true);
    expect(details.open).toBe(true);
    expect(runs[0]?.frames.map((f) => f.opacity)).toEqual([0, 1]);
    expect(runs[0]?.frames[0]?.height).toBe("0px");
    expect(toggleLine(details)).toBe(true);
    // Still open while it closes, so the panel can shrink in view.
    expect(details.open).toBe(true);
    expect(details.dataset.state).toBe("closed");
    expect(runs[1]?.frames.map((f) => f.height)).toEqual([`${panel.offsetHeight}px`, "0px"]);
    runs[1]?.finish();
    expect(details.open).toBe(false);
    expect(details.dataset.state).toBeUndefined();
  });

  it("opens a line again when it is clicked while closing", () => {
    render(<FeatureIndex />);
    const details = detailsOf("net-worth");
    const panel = details.querySelector<HTMLElement>("[data-line-panel]") as HTMLElement;
    const runs: Keyframe[][] = [];
    panel.animate = ((frames: Keyframe[]) => {
      runs.push(frames);
      return { onfinish: null } as unknown as Animation;
    }) as typeof panel.animate;
    panel.getAnimations = () => [];
    toggleLine(details);
    toggleLine(details);
    expect(details.dataset.state).toBe("closed");
    // The closing never finished: the next click opens it, not closes it again.
    toggleLine(details);
    expect(details.open).toBe(true);
    expect(details.dataset.state).toBe("open");
    expect(runs[2]?.map((f) => f.opacity)).toEqual([0, 1]);
  });

  it("opens and focuses the line named by the hash on load, and no other", () => {
    window.history.replaceState(null, "", "/features#pay-extra");
    render(<FeatureIndex />);
    expect(detailsOf("pay-extra").open).toBe(true);
    expect(document.activeElement).toBe(detailsOf("pay-extra").querySelector("summary"));
    expect(detailsOf("net-worth").open).toBe(false);
  });

  it("renders and opens nothing when the hash is malformed", () => {
    window.history.replaceState(null, "", "/features#%E0");
    render(<FeatureIndex />);
    expect(screen.getByRole("heading", { level: 3, name: "Budget" })).toBeDefined();
    expect(ALL_FEATURE_LINES.some((line) => detailsOf(line.id).open)).toBe(false);
  });

  it("opens a line when the hash changes later, and ignores a hash that is not a line", () => {
    render(<FeatureIndex />);
    act(() => {
      window.history.replaceState(null, "", "/features#group-budget");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(ALL_FEATURE_LINES.some((line) => detailsOf(line.id).open)).toBe(false);
    act(() => {
      window.history.replaceState(null, "", "/features#retirement-plan");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(detailsOf("retirement-plan").open).toBe(true);
  });

  it("carries the quiet labels: In testing on the AI connection, Off by default on Self Assessment", () => {
    render(<FeatureIndex />);
    expect(detailsOf("ask-ai").querySelector("summary")?.textContent).toContain("In testing");
    expect(detailsOf("self-assessment").querySelector("summary")?.textContent).toContain(
      "Off by default",
    );
    expect(detailsOf("take-home-pay").querySelector("summary")?.textContent).not.toMatch(
      /In testing|Off by default/,
    );
  });

  it("links a group heading only when given a page for it", () => {
    render(<FeatureIndex groupHrefs={{ budget: "/features/budget" }} />);
    const budget = screen.getByRole("heading", { level: 3, name: "Budget" });
    expect(within(budget).getByRole("link").getAttribute("href")).toBe("/features/budget");
    const home = screen.getByRole("heading", { level: 3, name: "Home and setup" });
    expect(within(home).queryByRole("link")).toBeNull();
  });
});
