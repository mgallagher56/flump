import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InviteSignIn } from "./InviteSignIn";

vi.mock("../../utils/url", () => ({ getAppUrl: () => "https://app.example.test" }));

describe("InviteSignIn", () => {
  it("is one quiet line whose Sign in goes to the web app's sign-in, as the header's does", () => {
    render(<InviteSignIn />);
    const line = screen.getByTestId("invite-sign-in");
    expect(line.tagName).toBe("P");
    expect(line.textContent).toBe("Have an invite link? Sign in.");
    const links = within(line).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]?.textContent).toBe("Sign in");
    expect(links[0]?.getAttribute("href")).toBe("https://app.example.test/login");
  });

  it("asks no one to request an invite", () => {
    render(<InviteSignIn />);
    expect(screen.queryByText(/request an invite/i)).toBeNull();
  });
});
