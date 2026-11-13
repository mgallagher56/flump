import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROFILE } from "~/hooks/useUserProfile";
import * as avatarUtils from "~/utils/avatar";
import { ProfileTab } from "./ProfileTab";

const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);

vi.mock("~/hooks/useUserProfile", async () => {
  const actual: typeof import("~/hooks/useUserProfile") =
    await vi.importActual("~/hooks/useUserProfile");
  return {
    ...actual,
    useUserProfile: () => ({ profile: actual.DEFAULT_PROFILE, updateProfile: mockUpdateProfile }),
  };
});

const saveButton = () => screen.getByRole("button", { name: "Save changes" }) as HTMLButtonElement;

describe("<ProfileTab />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockResolvedValue(undefined);
  });

  it("renders initials as the thumbnail when there is no avatar", () => {
    render(<ProfileTab profile={{ ...DEFAULT_PROFILE, firstName: "Jane", lastName: "Doe" }} />);
    expect(screen.getByTestId("user-avatar-fallback").textContent).toBe("JD");
    expect(screen.queryByTestId("remove-picture-button")).toBeNull();
  });

  it("shows the picture and a remove button when avatarUrl is set", () => {
    render(<ProfileTab profile={{ ...DEFAULT_PROFILE, avatarUrl: "https://example.com/p.jpg" }} />);
    expect(screen.getByTestId("user-avatar-image")).toBeDefined();
    expect(screen.getByTestId("remove-picture-button")).toBeDefined();
  });

  it("uploads an image straight away", async () => {
    vi.spyOn(avatarUtils, "processImageFile").mockResolvedValueOnce("data:image/jpeg;base64,abc");
    render(<ProfileTab profile={DEFAULT_PROFILE} />);
    const file = new File(["x"], "avatar.png", { type: "image/png" });
    fireEvent.change(screen.getByTestId("profile-picture-input"), { target: { files: [file] } });
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ avatarUrl: "data:image/jpeg;base64,abc" }),
      ),
    );
  });

  it("removes the image straight away", async () => {
    render(<ProfileTab profile={{ ...DEFAULT_PROFILE, avatarUrl: "data:image/jpeg;base64,e" }} />);
    fireEvent.click(screen.getByTestId("remove-picture-button"));
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({ avatarUrl: null })),
    );
  });

  it("has no display name field, no country or currency, and no link back to profile", () => {
    render(<ProfileTab profile={DEFAULT_PROFILE} />);
    expect(screen.queryByLabelText(/display name/i)).toBeNull();
    expect(screen.queryByLabelText(/Country/i)).toBeNull();
    expect(screen.queryByLabelText(/Currency/i)).toBeNull();
    expect(screen.queryByRole("link", { name: /profile/i })).toBeNull();
  });

  it("points to the tax, pension and mortgage pages for the rest", () => {
    render(<ProfileTab profile={DEFAULT_PROFILE} />);
    expect(screen.getByRole("button", { name: /go to tax and take-home/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /go to pension/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /go to mortgage/i })).toBeDefined();
  });

  it("saves only when something changed, and sends only this tab's fields", async () => {
    const onDirtyChange = vi.fn();
    render(
      <ProfileTab
        profile={{ ...DEFAULT_PROFILE, firstName: "John", lastName: "Doe" }}
        onDirtyChange={onDirtyChange}
      />,
    );
    expect(saveButton().disabled).toBe(true);
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);

    fireEvent.change(screen.getByTestId("first-name-input"), { target: { value: "Johnny" } });
    fireEvent.change(screen.getByTestId("last-name-input"), { target: { value: "Smith" } });
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    expect(saveButton().disabled).toBe(false);

    fireEvent.click(saveButton());
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledTimes(1));
    const payload = mockUpdateProfile.mock.calls[0][0];
    expect(payload).toMatchObject({
      firstName: "Johnny",
      lastName: "Smith",
      country: "GB",
      currency: "GBP",
    });
    expect(payload).not.toHaveProperty("displayName");
    expect(payload).not.toHaveProperty("annualSalary");
    expect((await screen.findByRole("status")).textContent).toBe("Saved");
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    expect(saveButton().disabled).toBe(true);
  });

  it("always saves country GB and currency GBP", async () => {
    render(<ProfileTab profile={{ ...DEFAULT_PROFILE, country: "US", currency: "USD" }} />);
    fireEvent.change(screen.getByTestId("first-name-input"), { target: { value: "A" } });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ country: "GB", currency: "GBP" }),
      ),
    );
  });

  it("keeps the edits and shows an error when saving fails", async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error("boom"));
    const onDirtyChange = vi.fn();
    render(<ProfileTab profile={DEFAULT_PROFILE} onDirtyChange={onDirtyChange} />);
    fireEvent.change(screen.getByTestId("first-name-input"), { target: { value: "A" } });
    fireEvent.click(saveButton());
    expect((await screen.findByRole("alert")).textContent).toContain("could not save");
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it("discards edits back to the last saved state", () => {
    render(<ProfileTab profile={{ ...DEFAULT_PROFILE, firstName: "John" }} />);
    const input = screen.getByTestId("first-name-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Zed" } });
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(input.value).toBe("John");
    expect(saveButton().disabled).toBe(true);
  });

  it("lets a user set region and student loan (E23 D-4-C)", async () => {
    render(<ProfileTab profile={{ ...DEFAULT_PROFILE, taxRegion: null }} />);
    const region = screen.getByLabelText(/where do you pay tax/i) as HTMLSelectElement;
    const loan = screen.getByLabelText(/student loan plan/i) as HTMLSelectElement;
    expect(region.value).toBe("");
    expect(loan.value).toBe("");
    fireEvent.change(region, { target: { value: "SCOTLAND" } });
    fireEvent.change(loan, { target: { value: "NONE" } });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ taxRegion: "SCOTLAND", studentLoanPlans: [] }),
      ),
    );
  });

  it("keeps several stored student loan plans unless the user picks one", async () => {
    render(
      <ProfileTab profile={{ ...DEFAULT_PROFILE, studentLoanPlans: ["PLAN_2", "POSTGRAD"] }} />,
    );
    const loan = screen.getByLabelText(/student loan plan/i) as HTMLSelectElement;
    expect(loan.selectedOptions[0]?.textContent).toBe("Plan 2 and Postgraduate loan");
    fireEvent.change(screen.getByTestId("first-name-input"), { target: { value: "A" } });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ studentLoanPlans: ["PLAN_2", "POSTGRAD"] }),
      ),
    );
  });

  it("clearing a stored region saves null", async () => {
    render(<ProfileTab profile={{ ...DEFAULT_PROFILE, taxRegion: "WALES" }} />);
    fireEvent.change(screen.getByLabelText(/where do you pay tax/i), { target: { value: "" } });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({ taxRegion: null })),
    );
  });

  it("opts in to the Self Assessment module straight away, without the form save", async () => {
    render(<ProfileTab profile={DEFAULT_PROFILE} />);
    const toggle = screen.getByTestId("self-assessment-module-toggle") as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          enabledPages: expect.arrayContaining(["tax"]),
          dashboardWidgets: expect.arrayContaining(["tax"]),
          dashboardWidgetOrder: expect.arrayContaining(["tax"]),
        }),
      ),
    );
    expect(saveButton().disabled).toBe(true);
  });
});
