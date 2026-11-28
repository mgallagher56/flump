import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TicketClose } from "./TicketClose";

describe("TicketClose", () => {
  it("is a band named by its question, with one line and the invite", () => {
    render(<TicketClose tone="card" />);
    const band = screen.getByRole("region", { name: "Ready to see your own figures?" });
    expect(band.getAttribute("data-tone-band")).toBe("card");
    expect(screen.getByText("Start with a few rough figures.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Request an invite" }).getAttribute("href")).toBe(
      "/contact#beta",
    );
    // Prototype 11's own ticket (owner ruling A5), a picture beside the words, never their only
    // carrier; not the design system's onboarding picture.
    const card = screen.getByTestId("feature-final-cta");
    expect(within(card).getByTestId("getting-started-ticket").getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(card.querySelector("[data-scene='onboarding']")).toBeNull();
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
