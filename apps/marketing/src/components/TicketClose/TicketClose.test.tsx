import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TicketClose } from "./TicketClose";

describe("TicketClose", () => {
  it("is a band named by its question, with one line, the preview and the sign-in line", () => {
    render(<TicketClose tone="card" />);
    const band = screen.getByRole("region", { name: "Ready to see your own figures?" });
    expect(band.getAttribute("data-tone-band")).toBe("card");
    expect(screen.getByRole("heading", { level: 2 }).id).toBe("feature-cta-title");
    expect(screen.getByText("Start with a few rough figures.")).toBeDefined();
    const card = screen.getByTestId("feature-final-cta");
    expect(
      within(card)
        .getAllByRole("link")
        .map((a) => a.textContent),
    ).toEqual(["Interactive preview", "Sign in"]);
    const preview = within(card).getByRole("link", { name: "Interactive preview" });
    expect(preview.getAttribute("href")).toBe("/preview");
    expect(preview.getAttribute("data-variant")).toBe("primary");
    expect(within(card).getByTestId("invite-sign-in").textContent).toBe(
      "Have an invite link? Sign in.",
    );
    expect(within(card).getByRole("link", { name: "Sign in" }).getAttribute("href")).toMatch(
      /\/login$/,
    );
    expect(within(card).queryByText(/request an invite/i)).toBeNull();
  });

  it("shows prototype 10's gathered stack (owner, 28 Nov 2026), its Example tags in real text, hidden from assistive technology", () => {
    render(<TicketClose tone="card" />);
    const card = screen.getByTestId("feature-final-cta");
    const stack = within(card).getByTestId("close-stack");
    expect(stack.getAttribute("aria-hidden")).toBe("true");
    expect(stack.querySelectorAll("[data-close-piece]")).toHaveLength(6);
    expect(within(stack).getAllByText("Example", { exact: true })).toHaveLength(6);
    expect(card.querySelector("[data-testid='getting-started-ticket']")).toBeNull();
    expect(card.querySelector("[data-scene='onboarding']")).toBeNull();
  });

  it("takes another picture in its slot", () => {
    render(<TicketClose picture={<p>Another picture</p>} tone="card" />);
    const card = screen.getByTestId("feature-final-cta");
    expect(within(card).getByText("Another picture")).toBeDefined();
    expect(within(card).queryByTestId("close-stack")).toBeNull();
  });

  it("takes its own line and title id, for a page that needs them", () => {
    render(<TicketClose text="Start with your salary." titleId="pay-cta-title" tone="card" />);
    const band = screen.getByRole("region", { name: "Ready to see your own figures?" });
    expect(screen.getByRole("heading", { level: 2 }).id).toBe("pay-cta-title");
    expect(band.getAttribute("aria-labelledby")).toBe("pay-cta-title");
    expect(screen.getByText("Start with your salary.")).toBeDefined();
    expect(screen.queryByText("Start with a few rough figures.")).toBeNull();
  });

  it("takes the tone it is given", () => {
    render(<TicketClose tone="canvas" />);
    expect(
      screen
        .getByRole("region", { name: "Ready to see your own figures?" })
        .getAttribute("data-tone-band"),
    ).toBe("canvas");
  });
});
