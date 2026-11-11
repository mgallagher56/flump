import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeFAQ } from "./HomeFAQ";

describe("HomeFAQ", () => {
  it("renders FAQs and allows accordion toggling", () => {
    render(<HomeFAQ />);

    // First FAQ is open by default
    const firstButton = screen.getByRole("button", {
      name: /Can Flump move my money or make payments\?/i,
    });
    expect(firstButton.getAttribute("aria-expanded")).toBe("true");

    // Click first FAQ to close it
    fireEvent.click(firstButton);
    expect(firstButton.getAttribute("aria-expanded")).toBe("false");

    // Click second FAQ to open it
    const secondButton = screen.getByRole("button", {
      name: /Do I have to connect my bank accounts\?/i,
    });
    expect(secondButton.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(secondButton);
    expect(secondButton.getAttribute("aria-expanded")).toBe("true");
  });

  it("question toggles are native buttons exposing the expanded state", () => {
    render(<HomeFAQ />);
    const button = screen.getByRole("button", { name: /Is Flump free\?/i });
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("region", { name: /Can Flump move my money/i })).toBeDefined();
  });

  it("answers the payments question without regulatory claims", () => {
    const { container } = render(<HomeFAQ />);
    expect(
      screen.getByText("No. Flump has no feature to make payments or move money."),
    ).toBeDefined();
    expect(container.textContent ?? "").not.toMatch(/only reads|choose to share|US tax rules/i);
    expect(container.textContent ?? "").not.toMatch(/FCA|AISP|regulated by/);
  });

  it("asks 'Is Flump free?' without promising pricing", () => {
    render(<HomeFAQ />);
    expect(screen.getByRole("button", { name: /Is Flump free\?/i })).toBeDefined();
    expect(screen.queryByText(/free tier|credit card/i)).toBeNull();
  });
});
