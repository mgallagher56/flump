import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolGuide } from "./ToolGuide";

describe("ToolGuide", () => {
  it("renders guide sections and FAQs", () => {
    render(
      <ToolGuide
        faqs={[{ q: "Can I do both?", a: "Yes." }]}
        guideSections={[{ heading: "How it works", body: ["First.", "Second."] }]}
      />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "How it works" })).toBeDefined();
    expect(screen.getByText("Second.")).toBeDefined();
    expect(screen.getByRole("heading", { name: /frequently asked questions/i })).toBeDefined();
    expect(screen.getByRole("heading", { level: 3, name: "Can I do both?" })).toBeDefined();
  });
});
