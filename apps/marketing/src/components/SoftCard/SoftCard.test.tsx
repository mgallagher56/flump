import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SoftCard } from "./SoftCard";
import { softCard } from "./SoftCard.styles";

describe("SoftCard", () => {
  it("renders the element it is asked for, with its content and data attributes", () => {
    render(
      <ul>
        <SoftCard as="li" data-deal-item="" radius="panel">
          A deeper tool
        </SoftCard>
      </ul>,
    );
    const item = screen.getByRole("listitem");
    expect(item.textContent).toBe("A deeper tool");
    expect(item.getAttribute("data-deal-item")).toBe("");
  });

  it("takes the fill of the band it sits on: the canvas on a card band, the card on a canvas band", () => {
    const { rerender } = render(
      <SoftCard data-testid="card" radius="panel">
        x
      </SoftCard>,
    );
    const classes = () => screen.getByTestId("card").className;
    expect(classes()).toContain(softCard({ band: "card" }));
    rerender(
      <SoftCard band="canvas" data-testid="card" radius="panel">
        x
      </SoftCard>,
    );
    expect(classes()).toContain(softCard({ band: "canvas" }));
    expect(softCard({ band: "canvas" })).not.toBe(softCard({ band: "card" }));
  });

  it("wears the corner it is given in place of the base card's, the caller's class never fighting it", () => {
    const { rerender } = render(
      <SoftCard className="caller" data-testid="card" radius="showcase">
        x
      </SoftCard>,
    );
    const radii = () =>
      screen
        .getByTestId("card")
        .className.split(" ")
        .filter((name) => name.startsWith("bdr_"));
    expect(radii()).toEqual(["bdr_showcase"]);
    rerender(
      <SoftCard data-testid="card" radius="panel">
        x
      </SoftCard>,
    );
    expect(radii()).toEqual(["bdr_panel"]);
  });
});
