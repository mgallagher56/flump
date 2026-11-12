import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROFILE } from "~/hooks/useUserProfile";
import * as avatarUtils from "~/utils/avatar";
import UserProfilePanel, { calculateNetTakeHome } from "./UserProfilePanel";

const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);
const mockSetProfile = vi.fn();
const mockSendResetEmail = vi
  .fn()
  .mockResolvedValue({ success: true, message: "Reset email sent" });
const mockResetFinancialData = vi.fn().mockResolvedValue(undefined);

vi.mock("~/hooks/useUserProfile", async () => {
  const actual: any = await vi.importActual("~/hooks/useUserProfile");
  return {
    ...actual,
    useUserProfile: () => ({
      profile: actual.DEFAULT_PROFILE,
      setProfile: mockSetProfile,
      updateProfile: mockUpdateProfile,
      markChecklistStep: vi.fn(),
      sendPasswordResetEmail: mockSendResetEmail,
      resetFinancialData: mockResetFinancialData,
    }),
  };
});

describe("<UserProfilePanel />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders user initials as thumbnail when no avatar image is set", () => {
    render(
      <UserProfilePanel
        initialProfile={{
          ...DEFAULT_PROFILE,
          displayName: "Jane Doe",
          avatarUrl: null,
        }}
      />,
    );

    const fallback = screen.getByTestId("user-avatar-fallback");
    expect(fallback).toBeDefined();
    expect(fallback.textContent).toBe("JD");
    expect(screen.getByTestId("upload-picture-button")).toBeDefined();
    expect(screen.queryByTestId("remove-picture-button")).toBeNull();
  });

  it("renders user profile image when avatarUrl is present", () => {
    render(
      <UserProfilePanel
        initialProfile={{
          ...DEFAULT_PROFILE,
          displayName: "Jane Doe",
          avatarUrl: "https://example.com/photo.jpg",
        }}
      />,
    );

    expect(screen.getByTestId("user-avatar-image")).toBeDefined();
    expect(screen.getByTestId("remove-picture-button")).toBeDefined();
  });

  it("allows user to upload an image and calls updateProfile", async () => {
    vi.spyOn(avatarUtils, "processImageFile").mockResolvedValueOnce(
      "data:image/jpeg;base64,mockImageData",
    );

    render(
      <UserProfilePanel
        initialProfile={{
          ...DEFAULT_PROFILE,
          displayName: "Jane Doe",
          avatarUrl: null,
        }}
      />,
    );

    const file = new File(["dummy content"], "avatar.png", { type: "image/png" });
    const input = screen.getByTestId("profile-picture-input");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ avatarUrl: "data:image/jpeg;base64,mockImageData" }),
      );
    });
  });

  it("allows user to remove their profile image", async () => {
    render(
      <UserProfilePanel
        initialProfile={{
          ...DEFAULT_PROFILE,
          displayName: "Jane Doe",
          avatarUrl: "data:image/jpeg;base64,existingImage",
        }}
      />,
    );

    const removeBtn = screen.getByTestId("remove-picture-button");
    fireEvent.click(removeBtn);
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({ avatarUrl: null }));
    });
  });

  it("renders contextual links directing to Tax and Mortgage tools", () => {
    render(<UserProfilePanel initialProfile={DEFAULT_PROFILE} />);

    expect(screen.getByText("Employment, Tax & Property Settings")).toBeDefined();
    expect(screen.getByRole("button", { name: /Go to Tax & Take-Home/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Go to Mortgage Tracker/i })).toBeDefined();
  });

  it("allows user to edit first name, last name, and display name and save", async () => {
    render(
      <UserProfilePanel
        initialProfile={{
          ...DEFAULT_PROFILE,
          displayName: "Original Display",
          firstName: "John",
          lastName: "Doe",
        }}
      />,
    );

    const firstNameInput = screen.getByTestId("first-name-input") as HTMLInputElement;
    const lastNameInput = screen.getByTestId("last-name-input") as HTMLInputElement;
    const displayNameInput = screen.getByTestId("display-name-input") as HTMLInputElement;

    expect(firstNameInput.value).toBe("John");
    expect(lastNameInput.value).toBe("Doe");
    expect(displayNameInput.value).toBe("Original Display");

    fireEvent.change(firstNameInput, { target: { value: "Johnny" } });
    fireEvent.change(lastNameInput, { target: { value: "Smith" } });
    fireEvent.change(displayNameInput, { target: { value: "Johnny S" } });

    const saveBtn = screen.getByRole("button", { name: /Save Profile/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Johnny",
          lastName: "Smith",
          displayName: "Johnny S",
        }),
      );
    });
  });

  it("displays the user email address with verified status", () => {
    render(
      <UserProfilePanel
        initialProfile={DEFAULT_PROFILE}
        user={{ email: "jane.doe@example.com" }}
      />,
    );

    const emailDisplay = screen.getByTestId("user-email-display");
    expect(emailDisplay).toBeDefined();
    expect(emailDisplay.textContent).toContain("jane.doe@example.com");
    expect(emailDisplay.textContent).toContain("Verified");
  });

  it("sends a password reset email directly when Change Password is clicked", async () => {
    render(
      <UserProfilePanel initialProfile={DEFAULT_PROFILE} user={{ email: "user@example.com" }} />,
    );

    fireEvent.click(screen.getByTestId("change-password-trigger"));

    await waitFor(() => {
      expect(mockSendResetEmail).toHaveBeenCalledTimes(1);
    });
    expect(mockSendResetEmail).toHaveBeenCalledWith();
    expect(screen.queryByTestId("modal-new-password-input")).toBeNull();
    expect((await screen.findByTestId("password-reset-status")).textContent).toBe(
      "Reset email sent",
    );
  });

  it("shows an error when the reset email fails", async () => {
    mockSendResetEmail.mockRejectedValueOnce(new Error("Failed to send password reset email"));
    render(
      <UserProfilePanel initialProfile={DEFAULT_PROFILE} user={{ email: "user@example.com" }} />,
    );

    fireEvent.click(screen.getByTestId("change-password-trigger"));

    expect((await screen.findByTestId("password-reset-error")).textContent).toBe(
      "Failed to send password reset email",
    );
  });

  it("has no country or currency selector (UK only)", () => {
    render(<UserProfilePanel initialProfile={DEFAULT_PROFILE} />);
    expect(screen.queryByLabelText(/Country/i)).toBeNull();
    expect(screen.queryByLabelText(/Currency/i)).toBeNull();
  });

  it("always saves country GB and currency GBP", async () => {
    render(
      <UserProfilePanel initialProfile={{ ...DEFAULT_PROFILE, country: "US", currency: "USD" }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ country: "GB", currency: "GBP" }),
      );
    });
  });

  it("opens reset financial data modal and requires typing RESET to confirm", async () => {
    render(<UserProfilePanel initialProfile={DEFAULT_PROFILE} />);

    fireEvent.click(screen.getByTestId("reset-financial-data-trigger"));

    expect(screen.getByText("Reset all financial data")).toBeDefined();

    const confirmBtn = screen.getByRole("button", {
      name: "Reset everything",
    }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "reset" } });
    expect(confirmBtn.disabled).toBe(false);

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockResetFinancialData).toHaveBeenCalledTimes(1);
    });
  });

  it("shows a resetFinancialData rejection inside the dialog and keeps it open", async () => {
    mockResetFinancialData.mockRejectedValueOnce(new Error("Reset failed on the server"));
    render(<UserProfilePanel initialProfile={DEFAULT_PROFILE} />);

    fireEvent.click(screen.getByTestId("reset-financial-data-trigger"));
    fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "RESET" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset everything" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Reset failed on the server");
    expect(screen.getByRole("alertdialog")).toBeDefined();
  });

  it("cancelling the reset dialog does not call resetFinancialData", () => {
    mockResetFinancialData.mockClear();
    render(<UserProfilePanel initialProfile={DEFAULT_PROFILE} />);

    fireEvent.click(screen.getByTestId("reset-financial-data-trigger"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockResetFinancialData).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("switches to the AI & MCP Access tab and displays McpConnectionCard", () => {
    render(<UserProfilePanel initialProfile={DEFAULT_PROFILE} />);

    const aiTab = screen.getByRole("tab", { name: "AI & MCP Access" });
    expect(aiTab).toBeDefined();

    fireEvent.pointerDown(aiTab, { button: 0 });
    fireEvent.keyDown(aiTab, { key: "Enter", code: "Enter" });

    expect(
      screen.getByText("Model Context Protocol (MCP) & AI Connections (preview)"),
    ).toBeDefined();
    expect(screen.getByTestId("offline-context-pack-card")).toBeDefined();
  });
});

describe("calculateNetTakeHome", () => {
  it("returns null, never gross, when the employment type is unknown", () => {
    expect(calculateNetTakeHome(60000, null, 5, true)).toBeNull();
    expect(calculateNetTakeHome(60000, "other", 5, true)).toBeNull();
    expect(calculateNetTakeHome(60000, undefined, 5, true)).toBeNull();
  });

  it("returns null when salary is missing", () => {
    expect(calculateNetTakeHome(null, "employed")).toBeNull();
    expect(calculateNetTakeHome(0, "employed")).toBeNull();
  });

  it("returns a net figure below gross for a known type", () => {
    const result = calculateNetTakeHome(60000, "employed", 5, true);
    expect(result?.netAnnual).toBeLessThan(60000);
  });
});

describe("Self Assessment module toggle", () => {
  it("is off by default and opting in adds tax to pages, widgets and order", async () => {
    mockUpdateProfile.mockClear();
    render(<UserProfilePanel initialProfile={DEFAULT_PROFILE} />);
    const toggle = screen.getByTestId("self-assessment-module-toggle") as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          enabledPages: expect.arrayContaining(["tax"]),
          dashboardWidgets: expect.arrayContaining(["tax"]),
          dashboardWidgetOrder: expect.arrayContaining(["tax"]),
        }),
      );
    });
  });
});
