import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, MemoryRouter, RouterProvider, useNavigate } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseSettingsTab } from "~/features/settings/settings-tabs";
import { DEFAULT_PROFILE } from "~/hooks/useUserProfile";
import { SettingsPage } from "./SettingsPage";

const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);

vi.mock("~/features/ai-connections/useMcpTokens", () => ({
  useMcpTokens: () => ({ tokens: [], create: vi.fn(), revoke: vi.fn(), contextPack: vi.fn() }),
}));

vi.mock("~/hooks/useUserProfile", async () => {
  const actual: typeof import("~/hooks/useUserProfile") =
    await vi.importActual("~/hooks/useUserProfile");
  return {
    ...actual,
    useUserProfile: () => ({
      profile: actual.DEFAULT_PROFILE,
      setProfile: vi.fn(),
      updateProfile: mockUpdateProfile,
      sendPasswordResetEmail: vi.fn(),
      resetFinancialData: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

const GoToSecurity = () => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/app/profile?tab=security")}>
      go
    </button>
  );
};

const pressTab = (name: string) => {
  const tab = screen.getByRole("tab", { name });
  fireEvent.pointerDown(tab, { button: 0 });
  fireEvent.keyDown(tab, { key: "Enter", code: "Enter" });
};

const profile = { ...DEFAULT_PROFILE, firstName: "Jane", lastName: "Doe" };

const edit = (value = "Janet") =>
  fireEvent.change(screen.getByTestId("first-name-input"), { target: { value } });

const renderInRouter = () => {
  const router = createMemoryRouter(
    [
      {
        path: "/app/profile",
        element: <SettingsPage initialProfile={profile} user={{ email: "j@example.com" }} />,
      },
      { path: "/app/elsewhere", element: <p>Elsewhere</p> },
    ],
    { initialEntries: ["/app/profile"] },
  );
  render(<RouterProvider router={router} />);
  return router;
};

describe("<SettingsPage />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/");
  });

  it("has a single page heading and one hero block", () => {
    render(<SettingsPage initialProfile={profile} user={{ email: "j@example.com" }} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByTestId("settings-hero")).toHaveLength(1);
    expect(screen.getByTestId("settings-hero").textContent).toContain("Jane Doe");
    expect(screen.getByTestId("settings-hero").textContent).toContain("j@example.com");
  });

  it("offers Profile, Security and Data tabs, starting on Profile", () => {
    render(<SettingsPage initialProfile={profile} />);
    const names = screen.getAllByRole("tab").map((t) => t.textContent);
    expect(names).toEqual(["Profile", "Security", "Data"]);
    expect(screen.getByRole("tab", { name: "Profile" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("settings-profile-tab")).toBeDefined();
  });

  it("switches to the Security tab (token and MCP connections) and the Data tab", () => {
    render(<SettingsPage initialProfile={profile} />);
    pressTab("Security");
    expect(screen.getByTestId("settings-security-tab")).toBeDefined();
    expect(screen.getByTestId("offline-context-pack-card")).toBeDefined();
    pressTab("Data");
    expect(screen.getByTestId("reset-financial-data-trigger")).toBeDefined();
  });

  it("parses the ?tab= deep link, including the old names", () => {
    expect(parseSettingsTab("?tab=security")).toBe("security");
    expect(parseSettingsTab("?tab=ai_connections")).toBe("security");
    expect(parseSettingsTab("?tab=profile_security")).toBe("profile");
    expect(parseSettingsTab("?tab=data")).toBe("data");
    expect(parseSettingsTab("?tab=nope")).toBeNull();
    expect(parseSettingsTab("")).toBeNull();
  });

  it("opens the Security tab for ?tab=ai_connections", () => {
    window.history.pushState({}, "", "/app/profile?tab=ai_connections");
    render(<SettingsPage initialProfile={profile} />);
    expect(screen.getByRole("tab", { name: "Security" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("follows a changed search string while on the page", () => {
    render(
      <MemoryRouter initialEntries={["/app/profile"]}>
        <GoToSecurity />
        <SettingsPage initialProfile={profile} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("tab", { name: "Security" }).getAttribute("aria-selected")).toBe(
      "false",
    );
    fireEvent.click(screen.getByText("go"));
    expect(screen.getByRole("tab", { name: "Security" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("uses manual activation: arrow keys move focus without changing tab", () => {
    render(<SettingsPage initialProfile={profile} />);
    const profileTab = screen.getByRole("tab", { name: "Profile" });
    profileTab.focus();
    fireEvent.keyDown(profileTab, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Profile" }).getAttribute("aria-selected")).toBe("true");
  });

  describe("unsaved changes guard", () => {
    it("puts ?tab= back when Keep editing is chosen after a link asked for another tab", async () => {
      const router = createMemoryRouter(
        [
          {
            path: "/app/profile",
            element: <SettingsPage initialProfile={profile} user={{ email: "j@example.com" }} />,
          },
        ],
        { initialEntries: ["/app/profile"] },
      );
      render(<RouterProvider router={router} />);
      edit();
      await act(async () => {
        await router.navigate("/app/profile?tab=security");
      });
      expect(await screen.findByRole("alertdialog")).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
      await waitFor(() => expect(router.state.location.search).toBe("?tab=profile"));
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect((screen.getByTestId("first-name-input") as HTMLInputElement).value).toBe("Janet");
    });

    it("switches tabs without asking when nothing changed", () => {
      render(<SettingsPage initialProfile={profile} />);
      pressTab("Data");
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(screen.getByRole("tab", { name: "Data" }).getAttribute("aria-selected")).toBe("true");
    });

    it("asks before leaving the Profile tab with edits, and Keep editing stays put", () => {
      render(<SettingsPage initialProfile={profile} />);
      edit();
      pressTab("Security");
      expect(screen.getByRole("alertdialog")).toBeDefined();
      expect(screen.getByText("Discard unsaved changes?")).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(screen.getByRole("tab", { name: "Profile" }).getAttribute("aria-selected")).toBe(
        "true",
      );
      expect((screen.getByTestId("first-name-input") as HTMLInputElement).value).toBe("Janet");
    });

    it("discards the edits and moves on when confirmed", () => {
      render(<SettingsPage initialProfile={profile} />);
      edit();
      pressTab("Data");
      fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
      expect(screen.getByRole("tab", { name: "Data" }).getAttribute("aria-selected")).toBe("true");
      expect(mockUpdateProfile).not.toHaveBeenCalled();
      // Back on Profile the form starts clean, so there is no prompt next time.
      pressTab("Profile");
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect((screen.getByTestId("first-name-input") as HTMLInputElement).value).toBe("Jane");
    });

    it("does not ask again once the Profile tab has been saved", async () => {
      render(<SettingsPage initialProfile={profile} />);
      edit();
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledTimes(1));
      await screen.findByTestId("profile-saved");
      // Let the dirty-state effect reach the page before the next interaction.
      await act(async () => {});
      pressTab("Security");
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("blocks leaving the page through the router while dirty (useBlocker)", async () => {
      const router = renderInRouter();
      edit();
      await act(async () => {
        await router.navigate("/app/elsewhere");
      });
      expect(router.state.location.pathname).toBe("/app/profile");
      expect(screen.getByRole("alertdialog")).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
      expect(router.state.location.pathname).toBe("/app/profile");

      await act(async () => {
        await router.navigate("/app/elsewhere");
      });
      fireEvent.click(await screen.findByRole("button", { name: "Discard changes" }));
      await waitFor(() => expect(router.state.location.pathname).toBe("/app/elsewhere"));
    });

    it("lets the router navigate freely when nothing is unsaved", async () => {
      const router = renderInRouter();
      await act(async () => {
        await router.navigate("/app/elsewhere");
      });
      expect(router.state.location.pathname).toBe("/app/elsewhere");
    });

    it("warns on browser close or refresh only while dirty", () => {
      render(<SettingsPage initialProfile={profile} />);
      const clean = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(clean);
      expect(clean.defaultPrevented).toBe(false);
      edit();
      const dirty = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(dirty);
      expect(dirty.defaultPrevented).toBe(true);
    });
  });
});
