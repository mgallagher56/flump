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

describe("<SecurityTab />", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the account email with verified status", () => {
    render(<SecurityTab email="jane.doe@example.com" />);
    const display = screen.getByTestId("user-email-display");
    expect(display.textContent).toContain("jane.doe@example.com");
    expect(display.textContent).toContain("Verified");
  });

  it("says Not set rather than inventing an email", () => {
    render(<SecurityTab email={null} />);
    expect(screen.getByTestId("user-email-display").textContent).toContain("Not set");
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

  it("shows an error when the reset email fails", async () => {
    mockSendResetEmail.mockRejectedValueOnce(new Error("Failed to send password reset email"));
    render(<SecurityTab email="user@example.com" />);
    fireEvent.click(screen.getByTestId("change-password-trigger"));
    expect((await screen.findByTestId("password-reset-error")).textContent).toBe(
      "Failed to send password reset email",
    );
  });

  it("holds the MCP connection card", () => {
    render(<SecurityTab email="user@example.com" />);
    expect(
      screen.getByText("Model Context Protocol (MCP) & AI Connections (preview)"),
    ).toBeDefined();
    expect(screen.getByTestId("offline-context-pack-card")).toBeDefined();
  });
});
