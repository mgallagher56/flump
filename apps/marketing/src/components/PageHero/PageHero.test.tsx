import { render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageHero } from "./PageHero";

const hero = (props: Partial<Parameters<typeof PageHero>[0]> = {}) => (
  <PageHero
    data-testid="hero"
    label="Pay"
    lead="Your take-home pay, and an estimate of what a change would do to it."
    previewHref="/preview#preview-section-pay"
    title="Take-home pay and Self Assessment"
    titleId="pay-title"
    tones={["teal", "rose", "sky", "violet"]}
    {...props}
  />
);

describe("PageHero", () => {
  it("is a band labelled by its h1, with the label, the lead and both calls to action", () => {
    render(hero());
    const band = screen.getByRole("region", { name: "Take-home pay and Self Assessment" });
    expect(within(band).getByText("Pay", { selector: "p" })).toBeDefined();
    expect(within(band).getByRole("link", { name: "Request an invite" })).toBeDefined();
    expect(
      within(band).getByRole("link", { name: "Interactive preview" }).getAttribute("href"),
    ).toBe("/preview#preview-section-pay");
  });

  it("leaves out a label that only repeats the title, and the preview link when given none", () => {
    render(
      hero({ label: "Debt and borrowing", title: "Debt and borrowing", previewHref: undefined }),
    );
    expect(screen.queryByText("Debt and borrowing", { selector: "p" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Interactive preview" })).toBeNull();
  });

  it("server-renders four still orbs in the given colours, biggest first, behind the copy (MK1, MK11)", () => {
    const doc = new DOMParser().parseFromString(renderToString(hero()), "text/html");
    const stage = doc.querySelector('[data-testid="hero-stage"]');
    expect(stage?.getAttribute("data-scene")).toBe("still");
    expect(stage?.getAttribute("aria-hidden")).toBe("true");
    expect(
      [...(stage?.querySelectorAll("[data-glass-orb]") ?? [])].map((orb) =>
        orb.getAttribute("data-orb-tone"),
      ),
    ).toEqual(["teal", "rose", "sky", "violet"]);
    expect(doc.querySelector("canvas")).toBeNull();
  });

  it("has no motion control of its own: the header's Reduce motion is the one control (MK14)", () => {
    const doc = new DOMParser().parseFromString(renderToString(hero()), "text/html");
    expect(doc.querySelectorAll("button")).toHaveLength(0);
    expect(doc.body.textContent).not.toMatch(/(Pause|Play) animation/);
  });
});
