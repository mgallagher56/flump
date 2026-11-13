import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SignedOutPage } from "./SignedOutPage";

vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

describe("SignedOutPage", () => {
  it("renders its children above the footer", () => {
    render(
      <SignedOutPage>
        <p>Page body</p>
      </SignedOutPage>,
    );
    expect(screen.getByText("Page body")).toBeDefined();
    expect(screen.getByRole("contentinfo")).toBeDefined();
  });
});
