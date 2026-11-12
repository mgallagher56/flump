import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FlumpLogo } from "./FlumpLogo";

describe("FlumpLogo primitive", () => {
  it("is decorative by default", () => {
    const { container } = render(<FlumpLogo />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("exposes a name when labelled", () => {
    render(<FlumpLogo label="Flump" />);
    expect(screen.getByRole("img", { name: "Flump" })).toBeDefined();
  });

  it("uses no raw colour: the body fill is a gradient driven by tokens", () => {
    const { container } = render(<FlumpLogo />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/stop-color=/);
    expect(container.querySelectorAll("stop")).toHaveLength(2);
  });

  it("gives each instance its own gradient id", () => {
    const { container } = render(
      <>
        <FlumpLogo />
        <FlumpLogo />
      </>,
    );
    const ids = Array.from(container.querySelectorAll("radialGradient")).map((g) => g.id);
    expect(new Set(ids).size).toBe(2);
    const fills = Array.from(container.querySelectorAll("path[fill^='url']")).map((p) =>
      p.getAttribute("fill"),
    );
    expect(fills).toEqual(ids.map((id) => `url(#${id})`));
  });
});
