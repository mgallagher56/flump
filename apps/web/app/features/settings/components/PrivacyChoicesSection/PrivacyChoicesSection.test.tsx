import { OPTIONAL_STORAGE_KEY, STORAGE_PREFERENCE_LABEL } from "@repo/ui";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivacyChoicesSection } from "./PrivacyChoicesSection";

vi.mock("react-router", () => ({
  useRouteLoaderData: () => ({ marketingUrl: "https://flump.example" }),
}));

describe("<PrivacyChoicesSection />", () => {
  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("links to the four legal pages on the marketing site", () => {
    render(<PrivacyChoicesSection />);
    const links = within(screen.getByRole("list", { name: "Legal pages" })).getAllByRole("link");
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Privacy notice", "https://flump.example/privacy"],
      ["Terms of use", "https://flump.example/terms"],
      ["Cookies and browser storage", "https://flump.example/cookies"],
      ["Accessibility statement", "https://flump.example/accessibility"],
    ]);
  });

  it("switching optional storage off records it and clears the app's optional keys", () => {
    window.sessionStorage.setItem("flump.setup-step-count", "3");
    render(<PrivacyChoicesSection />);
    const control = screen.getByRole("switch", { name: STORAGE_PREFERENCE_LABEL });
    expect((control as HTMLInputElement).checked).toBe(true);

    fireEvent.click(control);

    expect(window.localStorage.getItem(OPTIONAL_STORAGE_KEY)).toBe("off");
    expect(window.sessionStorage.getItem("flump.setup-step-count")).toBeNull();
  });
});
