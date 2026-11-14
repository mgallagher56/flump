import { countFigures, expectPageRules } from "@repo/ui/testing";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SandboxRoute from "./sandbox";

// The whole sandbox page, with the real dashboard: the E16 PR 4 page rules for each household.

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams, vi.fn()],
}));

vi.mock("~/utils/auth.server", () => ({
  getAuthSession: vi.fn().mockResolvedValue({ user: null, accessToken: null }),
}));

vi.mock("~/hooks/useUserProfile", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useUserProfile: () => ({ profile: {}, updateProfile: vi.fn() }),
  };
});

const FORBIDDEN = /module|widget|baseline|Welcome back|bank feeds|Sign up to open/i;

const userFacingText = (root: HTMLElement): string =>
  [
    root.textContent ?? "",
    ...Array.from(root.querySelectorAll("[aria-label],[title]")).map(
      (el) => `${el.getAttribute("aria-label") ?? ""} ${el.getAttribute("title") ?? ""}`,
    ),
  ].join(" ");

const renderSandbox = (persona: string) => {
  mockSearchParams = new URLSearchParams(`persona=${persona}`);
  return render(
    <MemoryRouter>
      <SandboxRoute />
    </MemoryRouter>,
  );
};

describe.each(["medium", "debt", "high"])("sandbox page, %s household", (persona) => {
  beforeEach(() => window.localStorage.clear());

  it("keeps to the page rules with exactly two notices and two Sign up buttons", () => {
    const { container } = renderSandbox(persona);
    expectPageRules(container, { maxFigures: 10, maxNotSet: 3, projectionNotices: 1 });
    expect(container.querySelectorAll("[data-notice]")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Sign up" })).toHaveLength(2);
  });

  it("shows net worth once and at most four locked section cards with no links", () => {
    const { container } = renderSandbox(persona);
    expect(container.querySelectorAll('[data-figure="netWorth"]')).toHaveLength(1);
    expect(screen.getAllByText(/^Net worth$/)).toHaveLength(1);
    const cards = Array.from(container.querySelectorAll("[data-section-card]"));
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(4);
    for (const card of cards) {
      expect(card.querySelector("a")).toBeNull();
      expect(card.querySelector('[aria-label="Locked in this example"]')).not.toBeNull();
    }
  });

  it("has no forbidden words and no projection notice before the h1", () => {
    const { container } = renderSandbox(persona);
    expect(userFacingText(container)).not.toMatch(FORBIDDEN);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toContain("Example figures");
    const notice = document.querySelector('[data-notice="projection"]') as HTMLElement;
    expect(notice.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it("puts at most four figures in the first view", () => {
    renderSandbox(persona);
    const hero = screen.getByTestId("hero-figure");
    const strip = hero.nextElementSibling as HTMLElement;
    expect(countFigures(hero) + countFigures(strip)).toBeLessThanOrEqual(4);
  });
});

describe("sandbox page", () => {
  it("switches household through the tabs in the bar", () => {
    renderSandbox("medium");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Paying off debts" }), { button: 0 });
    expect(screen.getByText("What you owe")).toBeTruthy();
  });
});
