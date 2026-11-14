import { expectPageRules } from "@repo/ui/testing";
import { getToolEntry, getToolGuide, TOOL_CATALOGUE, TOOL_SLUGS } from "@repo/ui/tools";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import ToolsIndex, { meta as indexMeta } from "./tools._index";
import { loader as slugLoader, meta as slugMeta, ToolDetailPage } from "./tools.$slug";

vi.mock("react-router", async (importOriginal) => ({
  redirect: (await importOriginal<typeof import("react-router")>()).redirect,
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

async function renderTool(slug: string) {
  const res = await slugLoader({
    params: { slug },
    request: new Request(`http://localhost/tools/${slug}`),
  } as any);
  vi.mocked(useLoaderData).mockReturnValue(res);
  return render(<ToolDetailPage />);
}

const BANNED = [
  /ENGINE/,
  /mathematically/i,
  /guaranteed/i,
  /\bsyncs\b/i,
  /\bmonitors\b/i,
  /tax trap/i,
];

describe("Tools Routes", () => {
  it("renders ToolsIndex with every catalogue title in catalogue order", () => {
    render(<ToolsIndex />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "UK money calculators, free during the beta",
      }),
    ).toBeDefined();
    const titles = within(screen.getByRole("list", { name: "Calculators" }))
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(titles).toEqual(TOOL_CATALOGUE.map((t) => t.title));
  });

  it("puts no notice on the index and drops the saved-data claim", () => {
    const { container } = render(<ToolsIndex />);
    expect(container.querySelectorAll('[role="note"]')).toHaveLength(0);
    expectPageRules(container, { projectionNotices: 0 });
    expect(container.textContent).not.toMatch(/nothing you enter is saved/i);
    for (const pattern of BANNED) expect(container.textContent).not.toMatch(pattern);
  });

  it("titles the index with the beta wording", () => {
    expect(indexMeta({} as any)).toContainEqual({
      title: "UK money calculators, free during the beta | Flump",
    });
  });

  it("leads the index with debt and lists the income above £100,000 tool last", () => {
    render(<ToolsIndex />);
    const hrefs = within(screen.getByRole("list", { name: "Calculators" }))
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"))
      .filter((h) => h?.startsWith("/tools/"));
    expect(hrefs[0]).toBe("/tools/uk-debt-snowball-vs-avalanche-calculator");
    expect(hrefs.at(-1)).toBe("/tools/uk-100k-tax-trap-calculator");
  });

  it.each(TOOL_SLUGS)("%s: breadcrumb, h1 and one line, then the tool", async (slug) => {
    const { container } = await renderTool(slug);
    const entry = getToolEntry(slug);

    expect(screen.getByRole("heading", { level: 1, name: entry.title })).toBeDefined();
    const calculator = screen.getByRole("region", { name: "Calculator" });
    // The one line sits above the tool, and the embedded calculator repeats neither it nor a title.
    expect(screen.getAllByText(entry.description)).toHaveLength(1);
    expect(calculator.contains(screen.getByText(entry.description))).toBe(false);
    expect(within(calculator).queryAllByRole("heading", { level: 1 })).toHaveLength(0);
    // Sign-up is invite-only, so the tool's one button asks for an invite.
    expect(within(calculator).getByRole("button", { name: /Request an invite/ })).toBeDefined();
    expect(calculator.hasAttribute("aria-describedby")).toBe(false);

    // Exactly one notice, and it is the calculator's own.
    const notes = container.querySelectorAll('[role="note"]');
    expect(notes).toHaveLength(1);
    expect(calculator.contains(notes[0] as Node)).toBe(true);

    // Before the tool: only the breadcrumb and the page header (h1 and description).
    const before = Array.from(container.querySelectorAll("nav, h1, p, [role='note'], img, span"))
      .filter((el) => el.compareDocumentPosition(calculator) & Node.DOCUMENT_POSITION_FOLLOWING)
      .filter((el) => !calculator.contains(el));
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    for (const el of before) {
      const allowed =
        breadcrumb.contains(el) ||
        el.closest("h1") !== null ||
        el.closest("p")?.textContent === entry.description;
      expect(allowed, `unexpected ${el.tagName} "${el.textContent}" above the tool`).toBe(true);
    }

    // Guide and FAQ are closed native details, with their text in the markup.
    const details = Array.from(container.querySelectorAll("[data-tool-guide] details"));
    expect(details).toHaveLength(2);
    for (const d of details) expect(d.hasAttribute("open")).toBe(false);
    expect(container.textContent).toContain(getToolGuide(slug).faqs[0]?.a ?? "");
    expect(container.textContent).not.toMatch(/illustration only/i);
    for (const pattern of BANNED) expect(container.textContent).not.toMatch(pattern);
  });

  it("breadcrumb has no category crumb", async () => {
    await renderTool("uk-100k-tax-trap-calculator");
    const crumbs = within(screen.getByRole("navigation", { name: "Breadcrumb" })).getAllByRole(
      "listitem",
    );
    expect(crumbs.map((c) => c.textContent?.trim())).toEqual([
      "All calculators",
      "Pension contributions and income above £100,000",
    ]);
  });

  it("opens the guide for the income above £100,000 tool", async () => {
    await renderTool("uk-100k-tax-trap-calculator");
    fireEvent.click(document.querySelector("[data-tool-guide] summary") as HTMLElement);
    expect(screen.getByRole("heading", { name: "What changes above £100,000" })).toBeDefined();
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

  it.each([
    ["mortgage-overpay-vs-isa", "mortgage-overpayment-vs-isa-calculator"],
    ["section-24-landlord-calculator", "section-24-landlord-tax-calculator"],
    ["overdraft-interest-calculator", "overdraft-cost-and-payoff-calculator"],
  ])("slug loader redirects %s to /tools/%s with a 301", async (from, to) => {
    const thrown = await slugLoader({
      params: { slug: from },
      request: new Request(`http://localhost/tools/${from}`),
    } as any).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(301);
    expect((thrown as Response).headers.get("Location")).toBe(`/tools/${to}`);
  });

  it("keeps the query string when redirecting an alias", async () => {
    const thrown = await slugLoader({
      params: { slug: "mortgage-overpay-vs-isa" },
      request: new Request("http://localhost/tools/mortgage-overpay-vs-isa?utm_source=x&a=1"),
    } as any).catch((e: unknown) => e);
    expect((thrown as Response).status).toBe(301);
    expect((thrown as Response).headers.get("Location")).toBe(
      "/tools/mortgage-overpayment-vs-isa-calculator?utm_source=x&a=1",
    );
  });

  it.each([
    ["UK-100k-Tax-Trap-Calculator", "uk-100k-tax-trap-calculator"],
    ["Mortgage-Overpay-VS-ISA", "mortgage-overpayment-vs-isa-calculator"],
  ])("matches %s case-insensitively and redirects to /tools/%s", async (from, to) => {
    const thrown = await slugLoader({
      params: { slug: from },
      request: new Request(`http://localhost/tools/${from}?ref=1`),
    } as any).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(301);
    expect((thrown as Response).headers.get("Location")).toBe(`/tools/${to}?ref=1`);
  });

  it("slugMeta returns the catalogue meta title and description", () => {
    const tool = getToolEntry("uk-pay-rise-take-home-calculator");
    expect(slugMeta({ data: { tool } } as any)).toEqual([
      { title: `${tool.metaTitle} | Flump` },
      { name: "description", content: tool.description },
    ]);
    expect(slugMeta({ data: null } as any)).toEqual([{ title: "Calculator not found | Flump" }]);
  });

  it("404s an unknown slug with the plain not-found line", async () => {
    const thrown = await slugLoader({
      params: { slug: "unknown-calc" },
      request: new Request("http://localhost/tools/unknown-calc"),
    } as any).catch((e: unknown) => e);
    expect((thrown as Response).status).toBe(404);
    expect(await (thrown as Response).text()).toBe("We cannot find that calculator.");
  });
});
