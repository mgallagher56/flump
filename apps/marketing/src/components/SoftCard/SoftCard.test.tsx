import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SoftCard } from "./SoftCard";
import { softCard } from "./SoftCard.styles";

describe("SoftCard", () => {
  it("renders the element it is asked for, with its content and data attributes", () => {
    render(
      <ul>
        <SoftCard as="li" data-deal-item="">
          A deeper tool
        </SoftCard>
      </ul>,
    );
    const item = screen.getByRole("listitem");
    expect(item.textContent).toBe("A deeper tool");
    expect(item.getAttribute("data-deal-item")).toBe("");
  });

  it("takes the fill of the band it sits on: the canvas on a card band, the card on a canvas band", () => {
    const { rerender } = render(<SoftCard data-testid="card">x</SoftCard>);
    const classes = () => screen.getByTestId("card").className;
    expect(classes()).toContain(softCard({ band: "card" }));
    rerender(
      <SoftCard band="canvas" data-testid="card">
        x
      </SoftCard>,
    );
    expect(classes()).toContain(softCard({ band: "canvas" }));
    expect(softCard({ band: "canvas" })).not.toBe(softCard({ band: "card" }));
  });
});
