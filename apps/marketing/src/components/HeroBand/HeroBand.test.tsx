import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroBand } from "./HeroBand";
import { hero } from "./HeroBand.styles";

const band = (props: Partial<Parameters<typeof HeroBand>[0]> = {}) => (
  <HeroBand
    data-testid="hero"
    lead="One plan you can use today."
    orbs={<span data-testid="orbs" />}
    title="Pricing"
    titleId="pricing-title"
    {...props}
  />
);

describe("HeroBand", () => {
  it("is a band labelled by its h1, with the lead, the orbs first and no call to action unless given", () => {
    render(band());
    const region = screen.getByRole("region", { name: "Pricing" });
    expect(region.firstElementChild?.getAttribute("data-testid")).toBe("orbs");
    expect(within(region).getByText("One plan you can use today.")).toBeDefined();
    expect(within(region).queryByRole("link")).toBeNull();
  });

  it("puts the actions and then the pause control under the copy when given", () => {
    render(
      band({
        actions: <a href="/x">Request an invite</a>,
        pause: <button type="button">Pause animation</button>,
      }),
    );
    const link = screen.getByRole("link", { name: "Request an invite" });
    const pause = screen.getByRole("button", { name: "Pause animation" });
    expect(link.compareDocumentPosition(pause) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("leaves out a label that only repeats the title, and keeps one that does not", () => {
    const { unmount } = render(band({ label: "Pricing" }));
    expect(screen.queryByText("Pricing", { selector: "p" })).toBeNull();
    unmount();
    render(band({ label: "Plans" }));
    expect(screen.getByText("Plans", { selector: "p" })).toBeDefined();
  });

  it("is the shorter band when compact, the full one otherwise", () => {
    const { unmount } = render(band({ compact: true }));
    expect(screen.getByTestId("hero").className).toBe(hero({ compact: true }));
    unmount();
    render(band());
    expect(screen.getByTestId("hero").className).toBe(hero({ compact: false }));
    expect(hero({ compact: true })).not.toBe(hero({ compact: false }));
  });
});
