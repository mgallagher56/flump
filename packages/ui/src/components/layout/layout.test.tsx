import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppSectionDivider } from "./AppSectionDivider";
import { SectionBand } from "./SectionBand";

describe("layout components", () => {
  describe("SectionBand", () => {
    it("renders default canvas tone with children", () => {
      render(
        <SectionBand id="intro" title="Section Title" subtitle="Subtitle text" indexBadge="01">
          <div>Content inside</div>
        </SectionBand>,
      );

      expect(screen.getByText("Section Title")).toBeDefined();
      expect(screen.getByText("Subtitle text")).toBeDefined();
      expect(screen.getByText("01")).toBeDefined();
      expect(screen.getByText("Content inside")).toBeDefined();
    });

    it("renders subtle, tinted, and contrast tones", () => {
      const { rerender } = render(
        <SectionBand tone="subtle">
          <div>Subtle Content</div>
        </SectionBand>,
      );
      expect(screen.getByText("Subtle Content")).toBeDefined();

      rerender(
        <SectionBand tone="tinted">
          <div>Tinted Content</div>
        </SectionBand>,
      );
      expect(screen.getByText("Tinted Content")).toBeDefined();

      rerender(
        <SectionBand tone="contrast" title="Contrast Title">
          <div>Contrast Content</div>
        </SectionBand>,
      );
      expect(screen.getByText("Contrast Title")).toBeDefined();
      expect(screen.getByText("Contrast Content")).toBeDefined();
    });
  });

  describe("AppSectionDivider", () => {
    it("renders label, optional badge, and action node", () => {
      render(
        <AppSectionDivider
          label="Accounts"
          badge="Live"
          action={<button type="button">Add Account</button>}
        />,
      );

      expect(screen.getByText("Accounts")).toBeDefined();
      expect(screen.getByText("Live")).toBeDefined();
      expect(screen.getByRole("button", { name: "Add Account" })).toBeDefined();
    });

    it("renders without badge and action", () => {
      render(<AppSectionDivider label="Simple Section" />);
      expect(screen.getByText("Simple Section")).toBeDefined();
    });
  });
});
