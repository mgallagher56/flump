import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MONEY_AREAS } from "../../utils/featureAreas";
import { AreaPills } from "./AreaPills";

describe("AreaPills", () => {
  it("links the five areas in the app's order, each with its orb", () => {
    render(<AreaPills tone="card" />);
    const strip = screen.getByTestId("area-strip");
    const links = within(strip).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(MONEY_AREAS.map((a) => a.path));
    expect(strip.querySelectorAll("[data-glass-orb]")).toHaveLength(5);
    expect(within(strip).queryByRole("link", { current: "page" })).toBeNull();
    expect(screen.queryByText("You are here")).toBeNull();
  });

  it("marks the current area, and only it", () => {
    render(<AreaPills current="pay" tone="canvas" />);
    const current = screen.getByRole("link", { current: "page" });
    expect(current.getAttribute("href")).toBe("/features/pay");
    expect(within(current).getByText("You are here")).toBeDefined();
    expect(screen.getAllByText("You are here")).toHaveLength(1);
  });
});
