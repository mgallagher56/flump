import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PROJECTION_NOTICE_TEXT, ProjectionNotice } from "./ProjectionNotice";

describe("ProjectionNotice", () => {
  it("shows the guidance-not-advice wording by default as a named note", () => {
    render(<ProjectionNotice />);
    const notice = screen.getByRole("note", { name: "Guidance, not advice" });
    expect(notice.textContent).toBe(PROJECTION_NOTICE_TEXT);
    expect(PROJECTION_NOTICE_TEXT).toMatch(/not financial, tax, investment or debt advice/);
  });

  it("exposes data-notice so page tests can count it", () => {
    const { container } = render(<ProjectionNotice />);
    expect(container.querySelectorAll('[data-notice="projection"]')).toHaveLength(1);
  });

  it("uses the quiet note style: no fill, no status colour", () => {
    render(<ProjectionNotice />);
    const html = screen.getByTestId("projection-notice").outerHTML;
    expect(html).not.toContain("status.info");
    expect(html).not.toContain("indigo");
    expect(html).toContain("text.secondary");
    expect(html).toContain("border.subtle");
  });

  it("shows a lead sentence before the unchanged wording, in the same one note", () => {
    const { container } = render(<ProjectionNotice lead="Unverified estimate." />);
    const notes = container.querySelectorAll("[data-notice]");
    expect(notes).toHaveLength(1);
    expect(notes[0]?.textContent).toBe(`Unverified estimate. ${PROJECTION_NOTICE_TEXT}`);
  });

  it("lets a page supply its own sentence", () => {
    render(<ProjectionNotice>Custom wording</ProjectionNotice>);
    expect(screen.getByTestId("projection-notice").textContent).toBe("Custom wording");
  });
});
