import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClosingCta } from "./ClosingCta";

const renderCta = () =>
  render(
    <ClosingCta
      cta={{ href: "/signup", label: "Request an invite" }}
      data-testid="closing"
      id="get-started"
      text="Start with a few rough numbers."
      title="Ready to see where you stand?"
      titleId="closing-title"
    />,
  );

describe("ClosingCta", () => {
  it("is the dark contrast band, labelled by its h2", () => {
    renderCta();
    const band = screen.getByRole("region", { name: "Ready to see where you stand?" });
    expect(band.id).toBe("get-started");
    expect(band.getAttribute("data-tone-band")).toBe("contrast");
    expect(
      screen.getByRole("heading", { level: 2, name: "Ready to see where you stand?" }).className,
    ).toContain("c_text.onContrast");
    expect(screen.getByText("Start with a few rough numbers.").className).toContain(
      "c_text.onContrast",
    );
  });

  it("holds one primary button to the call to action", () => {
    renderCta();
    const link = within(screen.getByTestId("closing")).getByRole("link", {
      name: "Request an invite",
    });
    expect(link.getAttribute("href")).toBe("/signup");
    expect(link.getAttribute("data-variant")).toBe("primary");
  });

  it("draws the scene in its dark colours, since the band is charcoal in both themes", () => {
    render(
      <ClosingCta
        cta={{ href: "/signup", label: "Request an invite" }}
        id="get-started"
        illustration={<svg data-testid="scene" />}
        text="Start with a few rough numbers."
        title="Ready to see where you stand?"
        titleId="closing-title"
      />,
    );
    expect(screen.getByTestId("scene").closest("[data-theme]")?.getAttribute("data-theme")).toBe(
      "dark",
    );
  });

  it("adds no scene wrapper when there is no scene", () => {
    const { container } = renderCta();
    expect(container.querySelector("[data-theme]")).toBeNull();
  });
});
