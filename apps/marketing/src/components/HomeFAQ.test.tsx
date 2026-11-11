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
});
