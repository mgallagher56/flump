import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TOOL_SLUGS } from "../toolCatalog";
import { getToolGuide, TOOL_GUIDES } from "../toolGuides";
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

  it("puts each count on its own line under the title (P75)", () => {
    render(<ToolGuide faqs={guide.faqs} guideSections={guide.guideSections} />);
    const count = screen.getByText(`${guide.faqs.length} questions`);
    expect(count.parentElement?.className).toContain("flex-d_column");
  });

  it("shows each section's paragraphs, and a singular count for one item", () => {
    const section = guide.guideSections[0];
    const faq = guide.faqs[0];
    if (!section || !faq) throw new Error("the snowball guide has a section and a question");
    render(<ToolGuide faqs={[faq]} guideSections={[section]} />);
    for (const paragraph of section.body) expect(screen.getByText(paragraph)).toBeTruthy();
    expect(screen.getByText("1 section")).toBeTruthy();
    expect(screen.getByText("1 question")).toBeTruthy();
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

  it("gives every section a heading and text, and every question an answer", () => {
    const filled = (s: unknown) => typeof s === "string" && s.trim().length > 0;
    for (const slug of TOOL_SLUGS) {
      for (const section of TOOL_GUIDES[slug].guideSections) {
        expect(filled(section.heading), `${slug} heading`).toBe(true);
        expect(section.body.length, `${slug}: ${section.heading}`).toBeGreaterThan(0);
        expect(section.body.every(filled), `${slug}: ${section.heading}`).toBe(true);
      }
      for (const faq of TOOL_GUIDES[slug].faqs) {
        expect(filled(faq.q) && filled(faq.a), `${slug}: ${faq.q}`).toBe(true);
      }
    }
  });

  it("looks a tool's guide up by its slug", () => {
    for (const slug of TOOL_SLUGS) expect(getToolGuide(slug)).toBe(TOOL_GUIDES[slug]);
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
