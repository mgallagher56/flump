import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  OPTIONAL_SESSION_KEY_PREFIXES,
  OPTIONAL_STORAGE_KEY,
  STORAGE_PREFERENCE_LABEL,
} from "@repo/ui";
import { expectPageRules } from "@repo/ui/testing";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { CookiesPage, NEEDED_ITEMS, OPTIONAL_ITEMS } from "./CookiesPage";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <CookiesPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

/** Keys in the value map that the page leaves out, each with the reason. */
const NOT_LISTED: Record<string, string> = {
  flump_dev_session: "test-only session for the end-to-end suite; never set for a real person",
  "wos-session": "the development name of the session cookie, and the old name that is cleared",
  flump_setup_checklist_dismissed: "no longer written or read, only removed on sign-out",
  flump_runway_calculator_settings: "no longer written, only removed",
};

/** Every key under `browser_storage:` in the value map, the one list of what the code writes. */
function valueMapKeys(): string[] {
  const yaml = readFileSync(
    join(__dirname, "..", "..", "..", "..", "..", "docs", "system", "value-map.yaml"),
    "utf8",
  );
  const block = yaml.slice(yaml.indexOf("\nbrowser_storage:"));
  return [...new Set([...block.matchAll(/^\s+key: (\S+?),?$/gm)].map((m) => m[1] as string))];
}

describe("CookiesPage", () => {
  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("has the statement's sections, in order", () => {
    renderPage();
    const main = screen.getByRole("main");
    expect(
      screen.getByRole("heading", { level: 1, name: "Cookies and browser storage" }),
    ).toBeDefined();
    expect(
      within(main)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent),
    ).toEqual([
      "The short version",
      "Items Flump needs",
      "Optional items",
      "Counting page views",
      "Clearing what is stored",
      "Changes to this page",
      "Related pages",
    ]);
    expectPageRules(main, { projectionNotices: 0 });
  });

  it("lists every key the value map says the code writes, or names why it is left out", () => {
    const keys = valueMapKeys();
    expect(keys.length).toBeGreaterThanOrEqual(13);
    const listed = new Set([...NEEDED_ITEMS, ...OPTIONAL_ITEMS].map((i) => i.name));
    const missing = keys.filter((key) => !listed.has(key) && !(key in NOT_LISTED));
    expect(missing).toEqual([]);
    // And nothing on the page that the code does not write.
    expect([...listed].filter((name) => !keys.includes(name))).toEqual([]);
  });

  it("shows each item with what it is for and how long it lasts", () => {
    const { container } = renderPage();
    for (const stored of [...NEEDED_ITEMS, ...OPTIONAL_ITEMS]) {
      const block = container.querySelector(`[data-storage-key="${stored.name}"]`);
      expect(block?.querySelector("dt")?.textContent).toBe(stored.name);
      expect(Array.from(block?.querySelectorAll("dd") ?? []).map((dd) => dd.textContent)).toEqual([
        stored.kind,
        stored.purpose,
        stored.lifetime,
      ]);
    }
  });

  it("offers the switch for exactly the optional keys the code treats as optional", () => {
    expect(OPTIONAL_ITEMS.map((i) => i.name.replace(/\*$/, "")).sort()).toEqual(
      [...OPTIONAL_SESSION_KEY_PREFIXES].sort(),
    );
  });

  it("switching off removes the optional items and records the choice", () => {
    window.sessionStorage.setItem("flump-marketing-scroll", '{"a":1}');
    renderPage();
    const optional = screen.getByRole("region", { name: "Optional items" });
    const control = within(optional).getByRole("switch", { name: STORAGE_PREFERENCE_LABEL });
    expect((control as HTMLInputElement).checked).toBe(true);

    fireEvent.click(control);

    expect((control as HTMLInputElement).checked).toBe(false);
    expect(window.sessionStorage.getItem("flump-marketing-scroll")).toBeNull();
    expect(window.localStorage.getItem(OPTIONAL_STORAGE_KEY)).toBe("off");
  });

  it("says there are no advertising or analytics cookies and no banner", () => {
    renderPage();
    const summary = screen.getByRole("region", { name: "The short version" }).textContent ?? "";
    expect(summary).toContain("no advertising cookies and no tracking or analytics cookies");
    expect(summary).toContain("so there is no cookie banner");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
