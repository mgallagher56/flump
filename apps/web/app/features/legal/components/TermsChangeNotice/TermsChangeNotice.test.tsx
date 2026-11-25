import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TermsChangeNotice } from "./TermsChangeNotice";

describe("<TermsChangeNotice />", () => {
  it("names the change and its date, and links to the acceptance page coming back here", () => {
    render(
      <TermsChangeNotice
        terms
        privacyNotice={false}
        effectiveFrom="2026-12-09"
        next="/app/budget"
      />,
    );
    expect(screen.getByText(/Our terms of use change on 9 December 2026\./)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Read the changes" }).getAttribute("href")).toBe(
      "/terms-acceptance?next=%2Fapp%2Fbudget",
    );
  });

  it("names the privacy notice alone, or both pages", () => {
    const { rerender } = render(
      <TermsChangeNotice terms={false} privacyNotice effectiveFrom="2026-12-09" next="/app" />,
    );
    expect(screen.getByText(/Our privacy notice changes on 9 December 2026\./)).toBeTruthy();
    rerender(<TermsChangeNotice terms privacyNotice effectiveFrom="2026-12-09" next="/app" />);
    expect(
      screen.getByText(/Our terms of use and privacy notice change on 9 December 2026\./),
    ).toBeTruthy();
  });

  it("hides until the next visit, storing nothing", () => {
    render(
      <TermsChangeNotice terms privacyNotice={false} effectiveFrom="2026-12-09" next="/app" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(screen.queryByTestId("terms-change-notice")).toBeNull();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
