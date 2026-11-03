import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROFILE } from "~/hooks/useUserProfile";
import * as avatarUtils from "~/utils/avatar";
import UserProfilePanel from "./UserProfilePanel";

const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);
const mockSetProfile = vi.fn();
const mockChangePassword = vi
  .fn()
  .mockResolvedValue({ success: true, message: "Password updated successfully" });
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
      changePassword: mockChangePassword,
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

  it("renders property and buy to let sections when Property tab is active", () => {
    render(
      <UserProfilePanel
        initialProfile={{
          ...DEFAULT_PROFILE,
          hasMortgage: true,
          mortgageType: "interest-only",
          hasBuyToLet: true,
          buyToLetCount: 2,
          buyToLetPropertyValue: 300000,
          buyToLetMonthlyRental: 1500,
          buyToLetMortgageBalance: 200000,
          buyToLetMortgageRate: 5.0,
          buyToLetMortgageType: "interest-only",
        }}
      />,
    );

    // Switch to Property & Mortgage tab via button
    const propertyTab = screen.getByRole("button", { name: /Property & Mortgage/i });
    fireEvent.click(propertyTab);

    expect(screen.getByText("Residential Property & Mortgage")).toBeDefined();
    expect(screen.getByText("Buy to Let (BTL) Property")).toBeDefined();
    expect(screen.getByText("Section 24 Tax Notice:")).toBeDefined();
    expect(screen.getByText("Gross Rental Yield")).toBeDefined();
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

  it("opens change password dialog and changes password successfully", async () => {
    render(
      <UserProfilePanel initialProfile={DEFAULT_PROFILE} user={{ email: "user@example.com" }} />,
    );

    const changePasswordTrigger = screen.getByTestId("change-password-trigger");
    fireEvent.click(changePasswordTrigger);

    const newPassInput = screen.getByTestId("modal-new-password-input");
    const confirmPassInput = screen.getByTestId("modal-confirm-password-input");
    const submitBtn = screen.getByTestId("submit-change-password-btn");

    fireEvent.change(newPassInput, { target: { value: "newSecretPassword123" } });
    fireEvent.change(confirmPassInput, { target: { value: "newSecretPassword123" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith("newSecretPassword123");
    });
  });

  it("switches sections using the mobile section select dropdown", () => {
    render(<UserProfilePanel initialProfile={DEFAULT_PROFILE} />);

    const mobileSelect = screen.getByTestId("mobile-section-select");
    expect(mobileSelect).toBeDefined();

    // Switch to Employment & Tax
    fireEvent.change(mobileSelect, { target: { value: "employment" } });
    expect(screen.getByText("Employment & Income")).toBeDefined();

    // Switch to Property & Mortgage
    fireEvent.change(mobileSelect, { target: { value: "property" } });
    expect(screen.getByText("Residential Property & Mortgage")).toBeDefined();
  });

  it("opens reset financial data modal and requires typing RESET to confirm", async () => {
    render(<UserProfilePanel initialProfile={DEFAULT_PROFILE} />);

    const resetTrigger = screen.getByTestId("reset-financial-data-trigger");
    fireEvent.click(resetTrigger);

    expect(screen.getByRole("heading", { name: /Reset All Financial Data/i })).toBeDefined();

    const confirmBtn = screen.getByTestId("confirm-reset-btn") as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);

    const confirmInput = screen.getByTestId("confirm-reset-input");
    fireEvent.change(confirmInput, { target: { value: "RESET" } });

    expect(confirmBtn.disabled).toBe(false);

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockResetFinancialData).toHaveBeenCalled();
    });
  });
});
