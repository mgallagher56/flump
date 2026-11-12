import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PROJECTION_NOTICE_TEXT, ProjectionNotice } from "./ProjectionNotice";

describe("ProjectionNotice", () => {
  it("shows the guidance-not-advice wording by default", () => {
    render(<ProjectionNotice />);
    const notice = screen.getByRole("complementary", { name: "Guidance, not advice" });
    expect(notice.textContent).toBe(PROJECTION_NOTICE_TEXT);
    expect(PROJECTION_NOTICE_TEXT).toMatch(/not financial, tax, investment or debt advice/);
  });

  it("lets a page supply its own sentence", () => {
    render(<ProjectionNotice>Custom wording</ProjectionNotice>);
    expect(screen.getByTestId("projection-notice").textContent).toBe("Custom wording");
  });
});
