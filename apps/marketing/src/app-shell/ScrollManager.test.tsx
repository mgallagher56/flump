import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, NavigationType, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyScroll, SCROLL_STORAGE_KEY, ScrollManager } from "./ScrollManager";

let scrollTo: ReturnType<typeof vi.fn>;

beforeEach(() => {
  scrollTo = vi.fn();
  vi.stubGlobal("scrollTo", scrollTo);
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("applyScroll", () => {
  it("opens a new page at the top and moves focus to its main content", () => {
    document.body.innerHTML = '<main id="main" tabindex="-1"></main>';
    applyScroll({ key: "b", hash: "" }, NavigationType.Push, { a: 900 });
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(document.activeElement?.id).toBe("main");
  });

  it("returns to the saved position on back or forward", () => {
    applyScroll({ key: "a", hash: "" }, NavigationType.Pop, { a: 900 });
    expect(scrollTo).toHaveBeenCalledWith(0, 900);
  });

  it("goes to the top on back to an entry it never saw, without moving focus", () => {
    document.body.innerHTML =
      '<button type="button">Back</button><main id="main" tabindex="-1"></main>';
    const back = document.querySelector("button");
    back?.focus();
    applyScroll({ key: "unknown", hash: "" }, NavigationType.Pop, {});
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(document.activeElement).toBe(back);
  });

  it("scrolls a link's anchor into view instead of going to the top", () => {
    document.body.innerHTML = '<section id="beta"></section>';
    const target = document.getElementById("beta") as HTMLElement;
    target.scrollIntoView = vi.fn();
    applyScroll({ key: "c", hash: "#beta" }, NavigationType.Push, {});
    expect(target.scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("goes to the top when the anchor is not on the page", () => {
    applyScroll({ key: "c", hash: "#missing" }, NavigationType.Push, {});
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});

function Nav() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate("/pricing")}>
        Pricing
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
    </>
  );
}

describe("ScrollManager", () => {
  it("leaves a first load with nothing saved to the browser, then resets on a link and restores on back", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ScrollManager />
        <Nav />
        <Routes>
          <Route path="/" element={<main id="main" tabIndex={-1} />} />
          <Route path="/pricing" element={<main id="main" tabIndex={-1} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(scrollTo).not.toHaveBeenCalled();
    expect(window.history.scrollRestoration).toBe("manual");

    // The reader scrolls the home page to 1,200 before following the link.
    Object.defineProperty(window, "scrollY", { configurable: true, value: 1200 });
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(JSON.parse(window.sessionStorage.getItem(SCROLL_STORAGE_KEY) ?? "{}")).toEqual({
      default: 1200,
    });

    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    await act(async () => screen.getByRole("button", { name: "Pricing" }).click());
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);

    await act(async () => screen.getByRole("button", { name: "Back" }).click());
    expect(scrollTo).toHaveBeenLastCalledWith(0, 1200);
  });

  it("returns to the saved position when the page is reloaded", () => {
    // MemoryRouter's first entry has the key "default" and loads as a POP, like a reload.
    window.sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify({ default: 640 }));
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ScrollManager />
      </MemoryRouter>,
    );
    expect(scrollTo).toHaveBeenCalledWith(0, 640);
  });
});
