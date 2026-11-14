import { expectPageRules } from "@repo/ui/testing";
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

  it("has one h1 'Settings', no hero and no save button: the Profile tab saves on change", () => {
    const { container } = render(
      <SettingsPage initialProfile={profile} user={{ email: "j@example.com" }} />,
    );
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]?.textContent).toBe("Settings");
    expect(container.querySelector('[data-tone="hero"]')).toBeNull();
    expect(screen.queryByTestId("settings-hero")).toBeNull();
    expectPageRules(container);
    expect(container.querySelectorAll('button[data-variant="primary"]')).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });

  it("shows the email once, on the Security tab", () => {
    render(<SettingsPage initialProfile={profile} user={{ email: "j@example.com" }} />);
    expect(screen.queryAllByText("j@example.com")).toHaveLength(0);
    pressTab("Security");
    expect(screen.getAllByText("j@example.com")).toHaveLength(1);
  });

  it("renders no bare native <select>: every select is the @repo/ui Select", () => {
    const { container } = render(<SettingsPage initialProfile={profile} />);
    for (const tab of ["Profile", "Security", "Data"]) {
      pressTab(tab);
      for (const select of Array.from(container.querySelectorAll("select"))) {
        // The @repo/ui Select wraps its control with a chevron icon; a bare <select> has none.
        expect(select.parentElement?.querySelector("svg")).not.toBeNull();
        expect(select.className).not.toBe("");
      }
    }
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

  it("switches tabs straight after an edit: a name saves when its field is left", async () => {
    render(<SettingsPage initialProfile={profile} />);
    const first = screen.getByTestId("first-name-input");
    edit();
    fireEvent.blur(first);
    pressTab("Security");
    expect(await screen.findByTestId("settings-security-tab")).toBeDefined();
    expect(screen.queryByText("Discard unsaved changes?")).toBeNull();
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: "Janet" }),
      ),
    );
  });
});
