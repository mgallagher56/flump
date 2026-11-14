import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TOOL_SLUGS } from "../toolCatalog";
import { TOOL_GUIDES } from "../toolGuides";
import { ToolGuide } from "./ToolGuide";

const guide = TOOL_GUIDES["uk-debt-snowball-vs-avalanche-calculator"];

const panels = (container: HTMLElement) => Array.from(container.querySelectorAll("details"));

describe("ToolGuide", () => {
  it("starts with the guide and the FAQ closed", () => {
    const { container } = render(
      <ToolGuide faqs={guide.faqs} guideSections={guide.guideSections} />,
    );
    const details = panels(container);
    expect(details).toHaveLength(2);
    for (const d of details) expect(d.hasAttribute("open")).toBe(false);
    expect(details.map((d) => d.querySelector("summary")?.textContent)).toEqual([
      expect.stringContaining("Guide"),
      expect.stringContaining("Frequently asked questions"),
    ]);
  });

  it("keeps the guide and FAQ text in the markup while closed (server HTML, no JavaScript)", () => {
    const html = renderToStaticMarkup(
      <ToolGuide faqs={guide.faqs} guideSections={guide.guideSections} />,
    );
    expect(html).not.toMatch(/<details[^>]*\bopen\b/);
    expect(html).toContain("How the two methods compare");
    expect(html).toContain(guide.faqs[0]?.a.replace(/'/g, "&#x27;") ?? "");
  });

  it("opens a panel from its summary", () => {
    const { container } = render(
      <ToolGuide faqs={guide.faqs} guideSections={guide.guideSections} />,
    );
    const [first] = panels(container);
    fireEvent.click(first?.querySelector("summary") as HTMLElement);
    expect(first?.open).toBe(true);
    expect(screen.getByRole("heading", { name: "How the two methods compare" })).toBeTruthy();
  });

  it("titles each panel with an h2 inside its summary", () => {
    const { container } = render(
      <ToolGuide faqs={guide.faqs} guideSections={guide.guideSections} />,
    );
    const titles = Array.from(container.querySelectorAll("summary h2")).map((h) => h.textContent);
    expect(titles).toEqual(["Guide", "Frequently asked questions"]);
  });

  it("names the counts in each summary line", () => {
    render(<ToolGuide faqs={guide.faqs} guideSections={guide.guideSections} />);
    expect(screen.getByText(`${guide.guideSections.length} sections`)).toBeTruthy();
    expect(screen.getByText(`${guide.faqs.length} questions`)).toBeTruthy();
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(<ToolGuide faqs={[]} guideSections={[]} />);
    expect(panels(container)).toHaveLength(0);
  });
});

describe("TOOL_GUIDES copy", () => {
  const BANNED = [
    /tax trap/i,
    /60% marginal rate/i,
    /index fund/i,
    /Stocks & Shares/,
    /mathematically/i,
    /guaranteed/i,
    /\boverdrafts\b/i,
    /commonly around/i,
    /24\.9%/,
    /1% to 2\.5%/,
    /\*\*/,
  ];

  it("has guide sections and FAQs for every tool", () => {
    for (const slug of TOOL_SLUGS) {
      expect(TOOL_GUIDES[slug].guideSections.length).toBeGreaterThan(0);
      expect(TOOL_GUIDES[slug].faqs.length).toBeGreaterThan(0);
    }
  });

  it("avoids the phrases the copy audit removed", () => {
    const text = Object.values(TOOL_GUIDES)
      .flatMap((g) => [
        ...g.guideSections.flatMap((s) => [s.heading, ...s.body]),
        ...g.faqs.flatMap((f) => [f.q, f.a]),
      ])
      .join("\n");
    for (const pattern of BANNED) expect(text).not.toMatch(pattern);
  });
});
