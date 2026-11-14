import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HomeFAQ } from "./HomeFAQ";

const renderFaq = () =>
  render(
    <MemoryRouter>
      <HomeFAQ />
    </MemoryRouter>,
  );

describe("HomeFAQ", () => {
  it("renders FAQs and allows accordion toggling", () => {
    renderFaq();
    const firstButton = screen.getByRole("button", {
      name: /Do I have to connect my bank accounts\?/i,
    });
    expect(firstButton.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(firstButton);
    expect(firstButton.getAttribute("aria-expanded")).toBe("false");

    const secondButton = screen.getByRole("button", {
      name: /What does Flump cover\?/i,
    });
    expect(secondButton.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(secondButton);
    expect(secondButton.getAttribute("aria-expanded")).toBe("true");
  });

  it("question toggles are native buttons exposing the expanded state", () => {
    renderFaq();
    const button = screen.getByRole("button", { name: /Is Flump free\?/i });
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("region", { name: /connect my bank accounts/i })).toBeDefined();
  });

  it("leaves the payments fact to the security strip and makes no regulatory claim", () => {
    const { container } = renderFaq();
    expect(screen.queryByRole("button", { name: /move my money/i })).toBeNull();
    expect(container.textContent ?? "").not.toMatch(/only reads|choose to share|US tax rules/i);
    expect(container.textContent ?? "").not.toMatch(/FCA|AISP|regulated by/);
  });

  it("says 'free' only with its beta condition, matching the pricing page", () => {
    renderFaq();
    fireEvent.click(screen.getByRole("button", { name: /Is Flump free\?/i }));
    expect(
      screen.getByText(
        "Flump is free during the beta. A paid plan may come later and its price is not set.",
      ),
    ).toBeDefined();
    expect(screen.queryByText(/not been announced|free tier|credit card/i)).toBeNull();
  });

  it("does not promise bank connection", () => {
    renderFaq();
    // The bank question is first, so it is open on arrival.
    expect(screen.getByRole("region", { name: /Do I have to connect/ }).textContent).not.toMatch(
      /coming soon|bank connection/i,
    );
  });

  it("is the home page's one mention of MCP, with a link to /mcp (D13)", () => {
    renderFaq();
    fireEvent.click(screen.getByRole("button", { name: /AI assistant/i }));
    expect(screen.getByRole("link", { name: "About the AI connection" }).getAttribute("href")).toBe(
      "/mcp",
    );
  });
});
