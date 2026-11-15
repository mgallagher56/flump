import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "../../patterns/EmptyState/EmptyState";
import { Illustration } from "./Illustration";
import { illustrationScenes } from "./Illustration.scenes";

describe("Illustration primitive", () => {
  it("offers all nine scenes from the shared shape definitions", () => {
    expect(illustrationScenes).toEqual([
      "empty-accounts",
      "empty-goals",
      "empty-savings",
      "empty-debt",
      "empty-pension",
      "check-in",
      "check-in-done",
      "onboarding",
      "not-found",
    ]);
  });

  it.each(illustrationScenes)("draws the %s scene as decorative, hidden artwork", (scene) => {
    const { container } = render(<Illustration id="art" scene={scene} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("focusable")).toBe("false");
    expect(svg?.getAttribute("role")).toBe("presentation");
    expect(svg?.getAttribute("data-scene")).toBe(scene);
    expect(svg?.hasAttribute("data-scene-settle")).toBe(true);
    expect(svg?.getAttribute("data-testid")).toBe("art");
    expect(svg?.querySelectorAll("title, text")).toHaveLength(0);
    expect(svg?.querySelector('[data-scene-part="sun"]')).not.toBeNull();
    expect(svg?.children.length).toBeGreaterThan(3);
  });

  it("tags sprout shapes on scenes that grow a sprout", () => {
    for (const scene of ["empty-pension", "onboarding"] as const) {
      const { container } = render(<Illustration scene={scene} />);
      expect(container.querySelector('[data-scene-part="sprout"]')).not.toBeNull();
    }
  });

  it("never embeds a raw colour", () => {
    for (const scene of illustrationScenes) {
      const { container } = render(<Illustration scene={scene} />);
      const html = container.innerHTML;
      expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(html).not.toMatch(/fill="(?!none)/);
      expect(html).not.toMatch(/stroke="/);
    }
  });

  it("slots into EmptyState with the wrapper hidden from assistive technology", () => {
    const { container } = render(
      <EmptyState illustration={<Illustration scene="empty-accounts" />} title="No accounts yet" />,
    );
    expect(container.querySelector("#empty-state-illustration")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(container.querySelector('svg[data-scene="empty-accounts"]')).not.toBeNull();
  });

  it("marks sun and sprout parts with data-scene-part and supports data-scene-settle", () => {
    const { container } = render(<Illustration scene="onboarding" settle />);
    const svg = container.querySelector("svg");
    expect(svg?.hasAttribute("data-scene-settle")).toBe(true);
    expect(svg?.querySelector('[data-scene-part="sun"]')).not.toBeNull();
    expect(svg?.querySelector('[data-scene-part="sprout"]')).not.toBeNull();
  });

  it("drops data-scene-settle when settle is false", () => {
    const { container } = render(<Illustration scene="onboarding" settle={false} />);
    const svg = container.querySelector("svg");
    expect(svg?.hasAttribute("data-scene-settle")).toBe(false);
  });
});
