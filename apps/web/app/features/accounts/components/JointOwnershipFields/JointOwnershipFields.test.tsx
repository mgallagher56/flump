import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { JointOwnershipFields, resolveSharePercent } from "./JointOwnershipFields";

describe("<JointOwnershipFields />", () => {
  test("shows only the ownership choice for a sole account", () => {
    render(
      <JointOwnershipFields
        ownership="sole"
        sharePercent={50}
        onOwnershipChange={vi.fn()}
        onSharePercentChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Ownership")).toBeDefined();
    expect(screen.queryByLabelText("Your share")).toBeNull();
  });

  test("shows the share for a joint account and reports changes", () => {
    const onOwnershipChange = vi.fn();
    const onSharePercentChange = vi.fn();
    render(
      <JointOwnershipFields
        ownership="joint"
        sharePercent={40}
        onOwnershipChange={onOwnershipChange}
        onSharePercentChange={onSharePercentChange}
      />,
    );
    expect((screen.getByLabelText("Your share") as HTMLInputElement).value).toBe("40");
    fireEvent.change(screen.getByLabelText("Ownership"), { target: { value: "sole" } });
    expect(onOwnershipChange).toHaveBeenCalledWith("sole");
    fireEvent.change(screen.getByLabelText("Your share"), { target: { value: "60" } });
    expect(onSharePercentChange).toHaveBeenLastCalledWith(60);
  });
});

describe("resolveSharePercent", () => {
  test("keeps a joint share between 1 and 100, whole, and gives a sole account none", () => {
    expect(resolveSharePercent("joint", 40.4)).toBe(40);
    expect(resolveSharePercent("joint", 0)).toBe(1);
    expect(resolveSharePercent("joint", 150)).toBe(100);
    expect(resolveSharePercent("joint", null)).toBe(50);
    expect(resolveSharePercent("sole", 40)).toBeNull();
  });
});
