import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PREVIEW_CAPTION, PreviewFrame } from "./PreviewFrame";

describe("PreviewFrame", () => {
  it("renders title, badge and default caption", () => {
    render(
      <PreviewFrame id="test-preview" title="Monthly picture">
        <div>Preview content</div>
      </PreviewFrame>,
    );

    expect(screen.getByRole("heading", { name: "Monthly picture" })).toBeDefined();
    expect(screen.getByText("Example")).toBeDefined();
    expect(screen.getByText(DEFAULT_PREVIEW_CAPTION)).toBeDefined();
    expect(screen.getByText("Preview content")).toBeDefined();
  });

  it("renders household switcher and fires onHouseholdChange", () => {
    const onHouseholdChange = vi.fn();
    render(
      <PreviewFrame
        household="renter"
        id="test-preview"
        onHouseholdChange={onHouseholdChange}
        title="Monthly picture"
      >
        <div>Content</div>
      </PreviewFrame>,
    );

    const renterBtn = screen.getByTestId("test-preview-switch-renter");
    const ownerBtn = screen.getByTestId("test-preview-switch-homeowner");

    expect(renterBtn.getAttribute("aria-pressed")).toBe("true");
    expect(ownerBtn.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(ownerBtn);
    expect(onHouseholdChange).toHaveBeenCalledWith("homeowner");
  });

  it("renders custom caption when provided", () => {
    render(
      <PreviewFrame caption="Custom caption text." id="test-preview" title="Monthly picture">
        <div>Content</div>
      </PreviewFrame>,
    );

    expect(screen.getByText("Custom caption text.")).toBeDefined();
  });

  it("renders the title as a plain label when the section has its own heading", () => {
    render(
      <PreviewFrame id="test-preview" title="Monthly picture" titleAs="p">
        <div>Content</div>
      </PreviewFrame>,
    );

    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByRole("figure", { name: "Monthly picture Example" })).toBeDefined();
  });
});
