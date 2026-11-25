import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { TermsStatus } from "~/features/legal/terms";
import { DELETE_ACCOUNT_CONFIRMATION, DELETE_ACCOUNT_INTENT } from "~/features/settings/account";
import { TermsAcceptanceScreen, type TermsAcceptanceScreenProps } from "./TermsAcceptanceScreen";

// The global test setup stubs parts of react-router; the form and fetcher need the real ones.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const page = (version: string, path: string, changed = false) => ({
  version,
  updated: "25 November 2026",
  effectiveFrom: "2026-11-25",
  path,
  changed,
});

const firstTime: TermsStatus = {
  required: true,
  agreed: false,
  firstTime: true,
  terms: page("0.1", "/terms"),
  privacyNotice: page("0.2", "/privacy"),
};

/** The props the next render uses; set by setup() before each render. */
let screenProps: Partial<TermsAcceptanceScreenProps> = {};
const download = vi.fn(async () => undefined);

function Screen() {
  return (
    <TermsAcceptanceScreen
      status={firstTime}
      marketingOrigin="https://flump.example/"
      next="/app"
      download={download}
      {...screenProps}
    />
  );
}

function setup(props: Partial<TermsAcceptanceScreenProps> = {}) {
  screenProps = props;
  download.mockClear();
  const posted: Array<Record<string, FormDataEntryValue>> = [];
  const deletes: Array<Record<string, FormDataEntryValue>> = [];
  const Stub = createRoutesStub([
    {
      path: "/terms-acceptance",
      Component: Screen,
      action: async ({ request }) => {
        posted.push(Object.fromEntries(await request.formData()));
        return null;
      },
    },
    {
      path: "/app/profile",
      action: async ({ request }) => {
        deletes.push(Object.fromEntries(await request.formData()));
        return { outcome: "recent_login_required" };
      },
    },
  ]);
  render(<Stub initialEntries={["/terms-acceptance"]} />);
  return { posted, deletes, download };
}

describe("<TermsAcceptanceScreen />", () => {
  it("asks a new person to agree to the terms and only to read the privacy notice", async () => {
    setup();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Please read and agree to our terms" }),
    ).toBeTruthy();
    const termsLinks = screen.getAllByRole("link", { name: "terms of use (opens in a new tab)" });
    expect(termsLinks).toHaveLength(2);
    for (const link of termsLinks) {
      expect(link.getAttribute("href")).toBe("https://flump.example/terms");
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
    expect(
      screen
        .getByRole("link", { name: "privacy notice (opens in a new tab)" })
        .getAttribute("href"),
    ).toBe("https://flump.example/privacy");
    expect(screen.getByText(/You do not need to agree to it\./)).toBeTruthy();
    expect(
      screen.getByText(/By selecting Agree and continue, you agree to the/, { selector: "p" }),
    ).toBeTruthy();
    // No checkbox to tick, and nothing about consent or marketing.
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(document.body.textContent).not.toMatch(/consent|marketing/i);
  });

  it("posts the versions it showed and where to go next", async () => {
    const { posted } = setup({ next: "/app/budget" });
    fireEvent.click(await screen.findByRole("button", { name: "Agree and continue" }));
    await waitFor(() =>
      expect(posted).toEqual([
        { termsVersion: "0.1", privacyNoticeVersion: "0.2", next: "/app/budget" },
      ]),
    );
  });

  it("says the terms changed, with the same agreement", async () => {
    setup({
      status: {
        ...firstTime,
        firstTime: false,
        terms: page("0.2", "/terms", true),
        privacyNotice: page("0.2", "/privacy"),
      },
    });
    expect(await screen.findByRole("heading", { name: "Our terms have changed" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Agree and continue" })).toBeTruthy();
  });

  it("names both pages when both changed", async () => {
    setup({
      status: {
        ...firstTime,
        firstTime: false,
        terms: page("0.2", "/terms", true),
        privacyNotice: page("0.3", "/privacy", true),
      },
    });
    expect(
      await screen.findByRole("heading", { name: "Our terms and privacy notice have changed" }),
    ).toBeTruthy();
  });

  it("asks only to read a changed privacy notice, never to agree to it", async () => {
    setup({
      status: { ...firstTime, firstTime: false, privacyNotice: page("0.3", "/privacy", true) },
    });
    expect(
      await screen.findByRole("heading", { name: "Our privacy notice has changed" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Agree and continue" })).toBeNull();
    expect(screen.queryByRole("link", { name: /terms of use/ })).toBeNull();
    expect(screen.queryByText(/If you do not agree/)).toBeNull();
    expect(
      screen.getByText(
        "If you would rather not continue, you can still download your data or delete your account.",
      ),
    ).toBeTruthy();
  });

  it("offers a coming change early, with a way to carry on and no data actions", async () => {
    setup({
      status: {
        ...firstTime,
        required: false,
        firstTime: false,
        terms: { ...page("0.2", "/terms", true), effectiveFrom: "2026-12-09" },
      },
      next: "/app",
    });
    expect(
      await screen.findByText(
        "These changes apply from 9 December 2026. You can carry on until then.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Not now" }).getAttribute("href")).toBe("/app");
    expect(screen.queryByTestId("terms-data-actions")).toBeNull();
  });

  it("explains a version that changed while reading", async () => {
    setup({ error: "changed" });
    expect((await screen.findByRole("alert")).textContent).toBe(
      "The terms or privacy notice changed while you were reading. Read the new versions.",
    );
  });

  it("lets a person who does not agree download their data", async () => {
    const { download } = setup();
    fireEvent.click(await screen.findByRole("button", { name: "Download your data" }));
    await waitFor(() => expect(download).toHaveBeenCalledTimes(1));
  });

  it("lets a person who does not agree delete their account, coming back here to sign in again", async () => {
    const { deletes } = setup();
    fireEvent.click(await screen.findByTestId("delete-account-trigger"));
    fireEvent.change(screen.getByLabelText(/to confirm/i), {
      target: { value: DELETE_ACCOUNT_CONFIRMATION },
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    await waitFor(() =>
      expect(deletes).toEqual([
        { intent: DELETE_ACCOUNT_INTENT, confirmation: DELETE_ACCOUNT_CONFIRMATION },
      ]),
    );
    expect(await screen.findByRole("button", { name: /sign in again/i })).toBeTruthy();
  });

  it("lets a person who does not agree sign out", async () => {
    setup();
    const actions = await screen.findByTestId("terms-acceptance");
    const signOut = within(actions).getByRole("button", { name: "Sign out" });
    const form = signOut.closest("form");
    expect(form?.getAttribute("action")).toBe("/logout");
    expect(form?.getAttribute("method")).toBe("post");
  });
});
