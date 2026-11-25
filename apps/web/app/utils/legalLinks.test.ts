// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const root = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock("react-router", () => ({ useRouteLoaderData: () => root.data }));

import {
  FALLBACK_MARKETING_ORIGIN,
  legalFooterLinks,
  legalHref,
  useMarketingOrigin,
} from "./legalLinks";

describe("legalLinks", () => {
  beforeEach(() => {
    root.data = undefined;
  });

  it("builds each legal page's address on the marketing site", () => {
    expect(legalHref("privacy", "https://flump.example")).toBe("https://flump.example/privacy");
    expect(legalHref("cookies", "https://flump.example/")).toBe("https://flump.example/cookies");
  });

  it("lists the four pages as links that leave the app, in footer order", () => {
    expect(legalFooterLinks("https://flump.example")).toEqual([
      { key: "privacy", label: "Privacy", href: "https://flump.example/privacy", external: true },
      { key: "terms", label: "Terms", href: "https://flump.example/terms", external: true },
      {
        key: "cookies",
        label: "Cookies and storage",
        href: "https://flump.example/cookies",
        external: true,
      },
      {
        key: "accessibility",
        label: "Accessibility",
        href: "https://flump.example/accessibility",
        external: true,
      },
    ]);
  });

  it("takes the marketing origin from the root loader", () => {
    root.data = { marketingUrl: "http://localhost:3001" };
    expect(useMarketingOrigin()).toBe("http://localhost:3001");
  });

  it("falls back to the deployed marketing site without root data or with an empty value", () => {
    expect(useMarketingOrigin()).toBe(FALLBACK_MARKETING_ORIGIN);
    root.data = { marketingUrl: "" };
    expect(useMarketingOrigin()).toBe(FALLBACK_MARKETING_ORIGIN);
  });
});
