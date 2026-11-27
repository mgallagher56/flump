import { act, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { lazyPages, preloadPage } from "./lazyPages";
import type { PageName } from "./pageSet";
import { MONEY_AREAS } from "./utils/featureAreas";

// Each page module stands in for the real page: a heading with its name, so a render shows which
// chunk it came from, without loading every page's tree.
const stub = vi.hoisted(() => (name: string) => () => ({
  [name]: (props: { feature?: { name: string } }) => (
    <h1>{props.feature ? `${name}: ${props.feature.name}` : name}</h1>
  ),
}));

vi.mock("./pages/HomePage", stub("HomePage"));
vi.mock("./pages/FeaturesIndexPage", stub("FeaturesIndexPage"));
vi.mock("./pages/FeaturePage", stub("FeaturePage"));
vi.mock("./pages/AiConnectionPage", stub("AiConnectionPage"));
vi.mock("./pages/PreviewPage", stub("PreviewPage"));
// The pricing chunk waits for the test to let it load, to show the page suspending meanwhile.
const pricingGate = vi.hoisted(() => {
  let open: () => void = () => {};
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { opened, open: () => open() };
});
vi.mock("./pages/PricingPage", async () => {
  await pricingGate.opened;
  return stub("PricingPage")();
});
vi.mock("./pages/SecurityPage", stub("SecurityPage"));
vi.mock("./pages/ContactPage", stub("ContactPage"));
vi.mock("./pages/PrivacyPage", stub("PrivacyPage"));
vi.mock("./pages/TermsPage", stub("TermsPage"));
vi.mock("./pages/CookiesPage", stub("CookiesPage"));
vi.mock("./pages/AccessibilityPage", stub("AccessibilityPage"));
vi.mock("./pages/NotFoundPage", stub("NotFoundPage"));

const NAMES: PageName[] = [
  "HomePage",
  "FeaturesIndexPage",
  "FeaturePage",
  "AiConnectionPage",
  "PreviewPage",
  "PricingPage",
  "SecurityPage",
  "ContactPage",
  "PrivacyPage",
  "TermsPage",
  "CookiesPage",
  "AccessibilityPage",
  "NotFoundPage",
];

const feature = MONEY_AREAS[0] as (typeof MONEY_AREAS)[number];

describe("lazyPages", () => {
  it("has a chunk for every page", () => {
    expect(Object.keys(lazyPages)).toEqual(NAMES);
  });

  it("loads a page's chunk once, resolving with the page component", async () => {
    const first = preloadPage("HomePage");
    expect(preloadPage("HomePage")).toBe(first);
    const Page = (await first) as () => unknown;
    expect(Page.name).toBe("HomePage");
  });

  it("renders a preloaded page at once, with no suspense", async () => {
    await preloadPage("ContactPage");
    const Page = lazyPages.ContactPage;
    render(
      <Suspense fallback={<p>Loading</p>}>
        <Page />
      </Suspense>,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("ContactPage");
    expect(screen.queryByText("Loading")).toBeNull();
  });

  it("suspends a page reached before its chunk has loaded, then shows it", async () => {
    const Page = lazyPages.PricingPage;
    await act(async () => {
      render(
        <Suspense fallback={<p>Loading</p>}>
          <Page />
        </Suspense>,
      );
    });
    expect(screen.getByText("Loading")).toBeTruthy();
    expect(screen.queryByRole("heading")).toBeNull();

    await act(async () => {
      pricingGate.open();
      await preloadPage("PricingPage");
    });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("PricingPage");
    expect(screen.queryByText("Loading")).toBeNull();
  });

  it("passes the feature through to the feature page", async () => {
    await preloadPage("FeaturePage");
    const Page = lazyPages.FeaturePage;
    render(<Page feature={feature} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      `FeaturePage: ${feature.name}`,
    );
  });

  it.each(NAMES.filter((name) => name !== "FeaturePage"))(
    "renders %s from its own chunk",
    async (name) => {
      await act(() => preloadPage(name));
      const Page = lazyPages[name] as () => React.JSX.Element;
      render(<Page />);
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(name);
    },
  );
});
