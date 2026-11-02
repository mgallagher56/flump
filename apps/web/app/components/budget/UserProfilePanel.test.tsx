import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROFILE } from "~/hooks/useUserProfile";
import * as avatarUtils from "~/utils/avatar";
import UserProfilePanel from "./UserProfilePanel";

const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);
const mockSetProfile = vi.fn();

vi.mock("~/hooks/useUserProfile", async () => {
  const actual: any = await vi.importActual("~/hooks/useUserProfile");
  return {
    ...actual,
    useUserProfile: () => ({
      profile: actual.DEFAULT_PROFILE,
      setProfile: mockSetProfile,
      updateProfile: mockUpdateProfile,
      markChecklistStep: vi.fn(),
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
});
