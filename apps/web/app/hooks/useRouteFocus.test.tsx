import { act, render, screen } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider, useNavigate } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { useRouteFocus } from "./useRouteFocus";

function Shell() {
  useRouteFocus();
  const navigate = useNavigate();
  return (
    <>
      <nav>
        {/* Buttons that navigate: the test setup replaces Link with its children. */}
        <button type="button" onClick={() => navigate("/budget")}>
          Budget
        </button>
        <button type="button" onClick={() => navigate("/budget#totals")}>
          Budget totals
        </button>
        <button type="button" onClick={() => navigate("/?tab=2")}>
          Same page, other tab
        </button>
        <button type="button" onClick={() => navigate(-1)}>
          Back
        </button>
      </nav>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}

function NoMain() {
  useRouteFocus("not-on-this-page");
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/budget")}>
      Budget
    </button>
  );
}

function PageThatFocusesItsHeading() {
  return (
    <h1 ref={(el) => el?.focus()} tabIndex={-1}>
      Budget
    </h1>
  );
}

function renderApp(budget = <p>Budget page</p>) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <Shell />,
        children: [
          { index: true, element: <p>Accounts page</p> },
          { path: "budget", element: budget },
        ],
      },
    ],
    { initialEntries: ["/"] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const main = () => document.getElementById("main-content");

describe("useRouteFocus", () => {
  it("leaves focus alone on the first load", async () => {
    renderApp();
    await screen.findByText("Accounts page");
    expect(document.activeElement).toBe(document.body);
  });

  it("moves focus from the control used to <main> when it opens a new page", async () => {
    renderApp();
    const link = await screen.findByRole("button", { name: "Budget" });
    link.focus();
    await act(async () => link.click());
    await screen.findByText("Budget page");
    expect(document.activeElement).toBe(main());
  });

  it("keeps focus where a new page has put it inside <main>", async () => {
    renderApp(<PageThatFocusesItsHeading />);
    const link = await screen.findByRole("button", { name: "Budget" });
    await act(async () => link.click());
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Budget" }));
  });

  it("moves focus without scrolling the page", async () => {
    renderApp();
    const link = await screen.findByRole("button", { name: "Budget" });
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    await act(async () => link.click());
    await screen.findByText("Budget page");
    const onMain = focus.mock.calls.filter((_, i) => focus.mock.contexts[i] === main());
    expect(onMain).toEqual([[{ preventScroll: true }]]);
    focus.mockRestore();
  });

  it("does nothing on a layout with no main region", async () => {
    const router = createMemoryRouter(
      [
        { path: "/", element: <NoMain /> },
        { path: "/budget", element: <NoMain /> },
      ],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);
    const link = await screen.findByRole("button", { name: "Budget" });
    link.focus();
    await act(async () => link.click());
    expect(router.state.location.pathname).toBe("/budget");
  });

  it("does not move focus for a link to an anchor, a change of query, or back", async () => {
    const router = renderApp();
    const anchor = await screen.findByRole("button", { name: "Budget totals" });
    anchor.focus();
    await act(async () => anchor.click());
    expect(router.state.location.hash).toBe("#totals");
    expect(document.activeElement).toBe(anchor);

    const back = screen.getByRole("button", { name: "Back" });
    back.focus();
    await act(async () => back.click());
    expect(router.state.location.pathname).toBe("/");
    expect(document.activeElement).toBe(back);

    const tab = screen.getByRole("button", { name: "Same page, other tab" });
    tab.focus();
    await act(async () => tab.click());
    expect(router.state.location.search).toBe("?tab=2");
    expect(document.activeElement).toBe(tab);
  });
});
