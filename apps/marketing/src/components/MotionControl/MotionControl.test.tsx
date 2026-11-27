import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AmbientMotionProvider } from "../../context/AmbientMotionContext";
import { MotionControl } from "./MotionControl";

const setReducedMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.ambient;
});

describe("MotionControl", () => {
  it("pauses and restarts ambient motion, marking the document while paused", () => {
    setReducedMotion(false);
    render(
      <AmbientMotionProvider>
        <MotionControl />
      </AmbientMotionProvider>,
    );
    const pause = screen.getByRole("button", { name: "Pause background animation" });
    expect(pause.hasAttribute("disabled")).toBe(false);
    act(() => fireEvent.click(pause));
    expect(document.documentElement.dataset.ambient).toBe("paused");
    const play = screen.getByRole("button", { name: "Play background animation" });
    act(() => fireEvent.click(play));
    expect(document.documentElement.dataset.ambient).toBeUndefined();
    expect(screen.getByRole("button", { name: "Pause background animation" })).toBe(play);
  });

  it("is out of reach with reduced motion, when nothing ambient moves", () => {
    setReducedMotion(true);
    render(
      <AmbientMotionProvider>
        <MotionControl />
      </AmbientMotionProvider>,
    );
    expect(screen.queryByRole("button")).toBeNull();
    const hidden = document.querySelector("[data-motion-control] button");
    expect(hidden?.getAttribute("tabindex")).toBe("-1");
    expect(hidden?.hasAttribute("disabled")).toBe(true);
  });

  it("is rendered disabled on the server, so it takes its place without shifting the page", () => {
    const html = renderToString(
      <AmbientMotionProvider>
        <MotionControl />
      </AmbientMotionProvider>,
    );
    expect(html).toContain("disabled");
    expect(html).toContain('tabindex="-1"');
  });
});
