import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { DELETE_ACCOUNT_CONFIRMATION, DELETE_ACCOUNT_INTENT } from "~/features/settings/account";
import { NotInvitedDataActions } from "./NotInvitedDataActions";

// The global test setup stubs parts of react-router; the delete request needs a real fetcher.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const download = vi.fn(async () => undefined);

let offerDownload = true;
function Sections() {
  return <NotInvitedDataActions download={download} offerDownload={offerDownload} />;
}

function setup(offer = true) {
  offerDownload = offer;
  download.mockClear();
  const received: Array<Record<string, FormDataEntryValue>> = [];
  const Stub = createRoutesStub([
    { path: "/", Component: Sections },
    {
      path: "/app/profile",
      action: async ({ request }) => {
        received.push(Object.fromEntries(await request.formData()));
        return { outcome: "recent_login_required" };
      },
    },
  ]);
  render(<Stub initialEntries={["/"]} />);
  return { download, received };
}

describe("<NotInvitedDataActions />", () => {
  it("with nothing stored (never invited), offers only deletion, without mentioning a download", async () => {
    setup(false);
    expect(await screen.findByText("This deletes your Flump account.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Download your data" })).toBeNull();
    expect(screen.queryByText(/download your data/i)).toBeNull();
  });

  it("downloads the person's data with the settings export", async () => {
    const { download } = setup();
    fireEvent.click(await screen.findByRole("button", { name: "Download your data" }));
    await waitFor(() => expect(download).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Your download has started.")).toBeTruthy();
  });

  it("deletes the account through the settings action after DELETE is typed, and shows its outcome", async () => {
    const { received } = setup();
    fireEvent.click(await screen.findByTestId("delete-account-trigger"));
    fireEvent.change(screen.getByLabelText(/to confirm/i), {
      target: { value: DELETE_ACCOUNT_CONFIRMATION },
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    await waitFor(() =>
      expect(received).toEqual([
        { intent: DELETE_ACCOUNT_INTENT, confirmation: DELETE_ACCOUNT_CONFIRMATION },
      ]),
    );
    // The action's answer reaches the dialog: here, sign in again first.
    expect(await screen.findByRole("button", { name: /sign in again/i })).toBeTruthy();
  });
});
