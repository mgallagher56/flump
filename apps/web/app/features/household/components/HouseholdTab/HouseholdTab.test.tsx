import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

// The shared setup stubs react-router's fetcher; this test needs the real data router.
vi.mock("react-router", async () => await vi.importActual("react-router"));

import type { HouseholdActionData, HouseholdSettingsData } from "../../household";
import { HouseholdTab } from "./HouseholdTab";

const NOT_IN_ONE: HouseholdSettingsData = {
  state: { household: null, invitation: null },
  jointSummary: null,
};

const inOne = (withName: string | null, sharesJointSummary = false): HouseholdSettingsData => ({
  state: {
    household: { sharesJointSummary, joinedAt: "2026-11-20T09:00:00.000Z", withName },
    invitation: null,
  },
  jointSummary: [],
});

/** Renders the tab in a data router whose action records each submission and answers `reply`. */
const renderTab = (data: HouseholdSettingsData, reply: (form: FormData) => HouseholdActionData) => {
  const submitted: Array<Record<string, string>> = [];
  const router = createMemoryRouter(
    [
      {
        path: "/app/profile",
        element: <HouseholdTab data={data} />,
        action: async ({ request }) => {
          const form = await request.formData();
          submitted.push(Object.fromEntries(form) as Record<string, string>);
          return reply(form);
        },
      },
    ],
    { initialEntries: ["/app/profile"] },
  );
  render(<RouterProvider router={router} />);
  return { submitted };
};

describe("<HouseholdTab />", () => {
  it("in a household, opens on who it is with and how to leave, before anything else", async () => {
    renderTab(inOne("Sam"), () => ({ success: false, error: "unused" }));
    const status = await screen.findByTestId("household-with");
    expect(status.textContent).toBe("You share a household with Sam.");
    const tab = screen.getByTestId("settings-household-tab");
    const leave = within(tab).getByTestId("household-leave");
    // Who and how to leave come before the sharing switch in reading order.
    const share = within(tab).getByRole("switch");
    expect(status.compareDocumentPosition(share) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(leave.compareDocumentPosition(share) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.queryByRole("button", { name: /Make a/ })).toBeNull();
  });

  it("says 'the other person' when there is no name", async () => {
    renderTab(inOne(null), () => ({ success: false, error: "unused" }));
    expect((await screen.findByTestId("household-with")).textContent).toBe(
      "You share a household with the other person.",
    );
  });

  it("turning sharing on sends the person's own choice", async () => {
    const { submitted } = renderTab(inOne("Sam"), () => ({
      intent: "household-sharing",
      sharesJointSummary: true,
    }));
    const toggle = (await screen.findByRole("switch")) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    await act(async () => fireEvent.click(toggle));
    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]).toEqual({ intent: "household-sharing", sharesJointSummary: "true" });
  });

  it("leaving sends only the leave intent", async () => {
    const { submitted } = renderTab(inOne("Sam"), () => ({
      intent: "household-leave",
      success: true,
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Leave household" }));
    const dialog = await screen.findByRole("alertdialog");
    await act(async () =>
      fireEvent.click(within(dialog).getByRole("button", { name: "Leave household" })),
    );
    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]).toEqual({ intent: "household-leave" });
  });

  it("not in a household, makes a link and shows it once", async () => {
    const { submitted } = renderTab(NOT_IN_ONE, () => ({
      intent: "household-create-link",
      link: "https://app.example/household/join/xyz",
      expiresAt: "2026-11-27T10:00:00.000Z",
    }));
    expect(screen.queryByTestId("household-with")).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
    await act(async () =>
      fireEvent.click(await screen.findByRole("button", { name: "Make a link" })),
    );
    const input = (await screen.findByRole("textbox", {
      name: "Invitation link",
    })) as HTMLInputElement;
    expect(input.value).toBe("https://app.example/household/join/xyz");
    expect(submitted).toEqual([{ intent: "household-create-link" }]);
  });

  it("shows the 409 message when making a link while already in a household", async () => {
    renderTab(NOT_IN_ONE, () => ({
      success: false,
      error:
        "You are already in a household. To join a different one, leave your current household first.",
    }));
    await act(async () =>
      fireEvent.click(await screen.findByRole("button", { name: "Make a link" })),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "You are already in a household.",
    );
  });

  it("cancelling sends the cancel intent and hides the link", async () => {
    let call = 0;
    const { submitted } = renderTab(NOT_IN_ONE, () =>
      ++call === 1
        ? {
            intent: "household-create-link",
            link: "https://app.example/household/join/xyz",
            expiresAt: "2026-11-27T10:00:00.000Z",
          }
        : { intent: "household-cancel-link", success: true },
    );
    await act(async () =>
      fireEvent.click(await screen.findByRole("button", { name: "Make a link" })),
    );
    await screen.findByRole("textbox", { name: "Invitation link" });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cancel link" })));
    await waitFor(() => expect(screen.queryByRole("textbox")).toBeNull());
    expect(submitted[1]).toEqual({ intent: "household-cancel-link" });
  });

  it("shows the help line in both states", async () => {
    renderTab(NOT_IN_ONE, () => ({ success: false, error: "unused" }));
    expect(await screen.findByTestId("sharing-help-line")).toBeDefined();
  });
});
