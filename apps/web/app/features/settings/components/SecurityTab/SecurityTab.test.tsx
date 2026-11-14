import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SecurityTab } from "./SecurityTab";

const mockSendResetEmail = vi
  .fn()
  .mockResolvedValue({ success: true, message: "Reset email sent" });

vi.mock("~/hooks/useUserProfile", async () => {
  const actual: typeof import("~/hooks/useUserProfile") =
    await vi.importActual("~/hooks/useUserProfile");
  return {
    ...actual,
    useUserProfile: () => ({
      profile: actual.DEFAULT_PROFILE,
      sendPasswordResetEmail: mockSendResetEmail,
    }),
  };
});

const mcp = {
  tokens: null as unknown[] | null,
  create: vi.fn(),
  revoke: vi.fn(),
  contextPack: vi.fn(),
};
vi.mock("~/features/ai-connections/useMcpTokens", () => ({ useMcpTokens: () => mcp }));

describe("<SecurityTab />", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the account email under How you sign in, with no unbacked Verified badge", () => {
    render(<SecurityTab email="jane.doe@example.com" />);
    expect(screen.getByRole("heading", { name: "How you sign in" })).toBeDefined();
    const display = screen.getByTestId("user-email-display");
    expect(display.textContent).toContain("jane.doe@example.com");
    expect(screen.queryByText("Verified")).toBeNull();
  });

  it("says Not set rather than inventing an email", () => {
    render(<SecurityTab email={null} />);
    expect(screen.getByTestId("user-email-display").textContent).toContain("Not set");
    expect(screen.queryByText("Verified")).toBeNull();
  });

  it("sends a password reset email directly", async () => {
    render(<SecurityTab email="user@example.com" />);
    fireEvent.click(screen.getByTestId("change-password-trigger"));
    await waitFor(() => expect(mockSendResetEmail).toHaveBeenCalledTimes(1));
    expect(mockSendResetEmail).toHaveBeenCalledWith();
    expect((await screen.findByTestId("password-reset-status")).textContent).toBe(
      "Reset email sent",
    );
  });

  it("shows the fixed error, never the server's message, when the email fails", async () => {
    mockSendResetEmail.mockRejectedValueOnce(new Error("Failed to send password reset email"));
    render(<SecurityTab email="user@example.com" />);
    fireEvent.click(screen.getByTestId("change-password-trigger"));
    expect((await screen.findByTestId("password-reset-error")).textContent).toBe(
      "We could not send the email. Your password is unchanged. Try again.",
    );
  });

  it("holds the MCP connection card", () => {
    render(<SecurityTab email="user@example.com" />);
    expect(screen.getByText("AI connections (preview)")).toBeDefined();
    expect(screen.getByTestId("offline-context-pack-card")).toBeDefined();
  });

  it("connects the AI connection card to the token API", () => {
    mcp.tokens = [];
    render(<SecurityTab email="user@example.com" />);
    expect(screen.queryByTestId("token-creation-unavailable")).toBeNull();
    fireEvent.click(screen.getByTestId("generate-token-trigger"));
    fireEvent.click(screen.getByTestId("confirm-generate-token"));
    expect(mcp.create).toHaveBeenCalledWith("Claude Desktop", true, 90, false);
  });

  it("links to Imports only once a token can stage", () => {
    mcp.tokens = [{ id: "t", name: "a", tokenPrefix: "p", scopes: ["mcp:read:anonymized"] }];
    const { unmount } = render(<SecurityTab email="user@example.com" />);
    expect(screen.queryByTestId("settings-imports-link")).toBeNull();
    unmount();
    mcp.tokens = [{ id: "t", name: "a", tokenPrefix: "p", scopes: ["write:stage"] }];
    render(<SecurityTab email="user@example.com" />);
    expect(screen.getByTestId("settings-imports-link").getAttribute("href")).toBe("/app/imports");
  });
});
