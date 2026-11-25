import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SHARE_SWITCH_LABEL, WhatIShareSection } from "./WhatIShareSection";

const renderSection = (
  sharesJointSummary: boolean,
  extra: { pending?: boolean; error?: string } = {},
) => {
  const onChange = vi.fn();
  render(
    <WhatIShareSection
      error={extra.error ?? null}
      pending={extra.pending ?? false}
      sharesJointSummary={sharesJointSummary}
      onChange={onChange}
    />,
  );
  return {
    onChange,
    toggle: screen.getByRole("switch", { name: SHARE_SWITCH_LABEL }) as HTMLInputElement,
  };
};

describe("<WhatIShareSection />", () => {
  it("shows one switch, off when the person shares nothing, and turning it on sends true", () => {
    const { onChange, toggle } = renderSection(false);
    expect(screen.getAllByRole("switch")).toHaveLength(1);
    expect(toggle.checked).toBe(false);
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("shows it on when the person shares, and turning it off sends false", () => {
    const { onChange, toggle } = renderSection(true);
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("is disabled while saving", () => {
    const { toggle } = renderSection(false, { pending: true });
    expect(toggle.disabled).toBe(true);
  });

  it("shows a save error as an alert, and none without one", () => {
    renderSection(false, { error: "We could not save that. Check the details and try again." });
    expect(screen.getByRole("alert").textContent).toContain(
      "We could not save that. Check the details and try again.",
    );
  });

  it("shows no alert without an error", () => {
    renderSection(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
