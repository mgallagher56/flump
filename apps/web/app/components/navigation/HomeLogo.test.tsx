import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";

import HomeLogo from "./HomeLogo";

// The shared setup stubs Link to render only its children; this test needs the real anchor.
vi.mock("react-router", async () => await vi.importActual("react-router"));

describe("<HomeLogo />", () => {
  test("exposes a single named link to home with a decorative image", () => {
    customRender(
      <MemoryRouter>
        <HomeLogo />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Flump home" });
    expect(link.getAttribute("href")).toBe("/");
    expect(link.querySelector("img")?.getAttribute("alt")).toBe("");
  });

  test("is hidden from assistive tech and the tab order when decorative", () => {
    customRender(
      <MemoryRouter>
        <HomeLogo decorative />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link")).toBeNull();
    const link = document.querySelector(".home-logo a");
    expect(link?.getAttribute("aria-hidden")).toBe("true");
    expect(link?.getAttribute("tabindex")).toBe("-1");
  });

  test("does not reference a raster asset", () => {
    customRender(
      <MemoryRouter>
        <HomeLogo />
      </MemoryRouter>,
    );
    expect(document.querySelector("img")?.getAttribute("src") ?? "").not.toMatch(/\.png$/);
  });
});
