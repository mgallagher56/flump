import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { normalizeProfile } from "~/hooks/useUserProfile";
import Header from "./Header";

// The real router: the shared setup stubs revalidation, and these tests are about it.
vi.mock("react-router", async () => await vi.importActual("react-router"));

// Audit slice 8, link L64 and finding CS-4: the navigation is drawn from the root loader's saved
// profile on the server and on the first client render, so the bar never shows the default pages
// first and then changes to the person's own choice.

const ROOT_DATA = {
  user: { id: "user-1" },
  userProfile: normalizeProfile({
    id: "profile-1",
    userId: "user-1",
    // Not the default set: no Debt, and Self Assessment chosen.
    enabledPages: ["accounts", "budget", "tax"],
    createdAt: "2026-11-01T09:00:00.000Z",
    updatedAt: "2026-11-19T09:00:00.000Z",
  }),
};

function makeRouter() {
  return createMemoryRouter(
    [{ id: "root", path: "/", element: <Header />, loader: () => ROOT_DATA }],
    { initialEntries: ["/"], hydrationData: { loaderData: { root: ROOT_DATA } } },
  );
}

/** The primary bar's top-level items, by label (the test i18n shows each label's key). */
const navItems = (root: ParentNode): string[] =>
  Array.from(root.querySelectorAll("nav[aria-label='Primary'] > ul > li")).map(
    (li) => li.textContent?.trim() ?? "",
  );

describe("navigation on the first paint (L64, CS-4)", () => {
  it("draws the person's own pages in the server markup", () => {
    const html = renderToString(<RouterProvider router={makeRouter()} />);
    const container = document.createElement("div");
    container.innerHTML = html;
    const items = navItems(container);
    // Savings, pension, debt and mortgage are not chosen, so neither of their groups shows.
    expect(items).toContain("accounts");
    expect(items).not.toContain("savingsAndPension");
    expect(items.some((label) => /borrow/i.test(label))).toBe(false);
  });

  it("hydrates to exactly the server's links, with no mismatch", async () => {
    const html = renderToString(<RouterProvider router={makeRouter()} />);
    const container = document.createElement("div");
    container.innerHTML = html;
    const serverItems = navItems(container);
    document.body.appendChild(container);

    const problems: string[] = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      problems.push(args.map(String).join(" "));
    });
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, <RouterProvider router={makeRouter()} />, {
        onRecoverableError: (error) => {
          problems.push(error instanceof Error ? error.message : String(error));
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    const clientItems = navItems(container);
    await act(async () => root?.unmount());
    container.remove();
    consoleError.mockRestore();

    expect(clientItems).toEqual(serverItems);
    expect(clientItems).not.toContain("savingsAndPension");
    expect(problems.filter((p) => /hydrat|did not match|server rendered/i.test(p))).toEqual([]);
  });
});
