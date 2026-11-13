import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import ToolsIndex from "./tools._index";
import { loader as slugLoader, meta as slugMeta, ToolDetailPage } from "./tools.$slug";

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
  useLoaderData: vi.fn(),
  Link: ({
    children,
    to,
    style,
    className,
  }: {
    children: ReactNode;
    to: string;
    style?: any;
    className?: string;
  }) => (
    <a className={className} href={to} style={style}>
      {children}
    </a>
  ),
}));

import { useLoaderData } from "react-router";

describe("Tools Routes", () => {
  it("renders ToolsIndex with every calculator listed", () => {
    render(<ToolsIndex />);

    expect(
      screen.getByRole("heading", { level: 1, name: /free uk money calculators/i }),
    ).toBeDefined();
    expect(
      within(screen.getByRole("list", { name: "Calculators" })).getAllByRole("heading", {
        level: 2,
      }),
    ).toHaveLength(7);
    expect(screen.getByText(/£100k–£125k tax trap calculator/i)).toBeDefined();
    expect(screen.getByText(/mortgage overpay vs isa calculator/i)).toBeDefined();
    expect(screen.getByText(/section 24 landlord tax calculator/i)).toBeDefined();
    expect(screen.getByText(/debt payoff: snowball vs avalanche calculator/i)).toBeDefined();
  });

  it("leads the index with debt and does not feature the £100k tool first", () => {
    render(<ToolsIndex />);
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"))
      .filter((h) => h?.startsWith("/tools/"));
    expect(hrefs[0]).toBe("/tools/uk-debt-snowball-vs-avalanche-calculator");
    expect(hrefs[0]).not.toBe("/tools/uk-100k-tax-trap-calculator");
  });

  it("slug loader returns the requested tool or throws 404", async () => {
    const res = await slugLoader({
      params: { slug: "uk-100k-tax-trap-calculator" },
      request: new Request("http://localhost/tools/uk-100k-tax-trap-calculator"),
    } as any);

    expect(res.tool).toBeDefined();
    expect(res.tool.slug).toBe("uk-100k-tax-trap-calculator");

    await expect(
      slugLoader({
        params: { slug: "unknown-calc" },
        request: new Request("http://localhost/tools/unknown-calc"),
      } as any),
    ).rejects.toThrow();
  });

  it("renders ToolDetailPage for tax trap calculator", async () => {
    const res = await slugLoader({
      params: { slug: "uk-100k-tax-trap-calculator" },
      request: new Request("http://localhost/tools/uk-100k-tax-trap-calculator"),
    } as any);
    vi.mocked(useLoaderData).mockReturnValue(res);

    render(<ToolDetailPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /uk £100k–£125k tax trap and childcare threshold calculator/i,
      }),
    ).toBeDefined();
    expect(screen.getByText(/what is the uk £100,000 tax trap\?/i)).toBeDefined();
    expect(screen.getByText(/illustration only/i)).toBeDefined();
    const calculator = screen.getByRole("region", { name: "Calculator, illustration" });
    expect(calculator.getAttribute("aria-describedby")).toBe("tool-sample-data-label");
    expect(document.getElementById("tool-sample-data-label")).not.toBeNull();
    expect(screen.getAllByText(/frequently asked questions/i).length).toBeGreaterThan(0);
  });

  it("renders ToolDetailPage for mortgage vs isa comparator", async () => {
    const res = await slugLoader({
      params: { slug: "mortgage-overpay-vs-isa" },
      request: new Request("http://localhost/tools/mortgage-overpay-vs-isa"),
    } as any);
    vi.mocked(useLoaderData).mockReturnValue(res);

    render(<ToolDetailPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /mortgage overpayment vs stocks and shares isa calculator/i,
      }),
    ).toBeDefined();
  });

  it("renders ToolDetailPage for section 24 landlord calculator", async () => {
    const res = await slugLoader({
      params: { slug: "section-24-landlord-calculator" },
      request: new Request("http://localhost/tools/section-24-landlord-calculator"),
    } as any);
    vi.mocked(useLoaderData).mockReturnValue(res);

    render(<ToolDetailPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /section 24 landlord mortgage relief and tax calculator/i,
      }),
    ).toBeDefined();
  });

  it("slugMeta returns correct tags", () => {
    const tags = slugMeta({
      data: {
        tool: {
          metaTitle: "Test Title",
          metaDescription: "Test Description",
        },
      },
    } as any);

    expect(tags).toEqual([
      { title: "Test Title" },
      { name: "description", content: "Test Description" },
    ]);

    const notFoundTags = slugMeta({ data: null } as any);
    expect(notFoundTags).toEqual([{ title: "Tool Not Found | Flump" }]);
  });
});
