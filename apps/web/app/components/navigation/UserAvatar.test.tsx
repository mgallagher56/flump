import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UserAvatar from "./UserAvatar";

describe("<UserAvatar />", () => {
  it("renders user initials when no image is provided", () => {
    render(<UserAvatar profile={{ firstName: "Jane", lastName: "Doe" }} size={32} />);
    const fallback = screen.getByTestId("user-avatar-fallback");
    expect(fallback).toBeDefined();
    expect(fallback.textContent).toBe("JD");
  });

  it("renders initials derived from user object email when profile name is missing", () => {
    render(
      <UserAvatar
        profile={{ firstName: null }}
        size={28}
        user={{ email: "marcgallagher@example.com" }}
      />,
    );
    const fallback = screen.getByTestId("user-avatar-fallback");
    expect(fallback.textContent).toBe("MA");
  });

  it("renders Avatar image when avatarUrl is present in profile", () => {
    const avatarUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    render(<UserAvatar profile={{ firstName: "Jane", lastName: "Doe", avatarUrl }} size={40} />);
    const root = screen.getByTestId("user-avatar");
    expect(root).toBeDefined();
  });

  it("renders fallback U when no profile or user is provided", () => {
    render(<UserAvatar profile={{ firstName: null, avatarUrl: null }} user={null} />);
    const fallback = screen.getByTestId("user-avatar-fallback");
    expect(fallback.textContent).toBe("U");
  });
});
