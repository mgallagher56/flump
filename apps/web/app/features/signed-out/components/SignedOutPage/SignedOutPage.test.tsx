import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SignedOutPage } from "./SignedOutPage";

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
