import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  EntryOwnershipField,
  type EntryOwnershipFieldProps,
  jointShareLabel,
} from "./EntryOwnershipField";

const setup = (over: Partial<EntryOwnershipFieldProps> = {}) => {
  const props: EntryOwnershipFieldProps = {
    idPrefix: "row-1",
    entryName: "Rent",
    ownership: "sole",
    sharePercent: null,
    onChange: vi.fn(),
    ...over,
  };
  const view = render(<EntryOwnershipField {...props} />);
  return { props, ...view };
};

describe("jointShareLabel", () => {
  it("reads 'Joint, 50%' for a joint entry without a share, nothing for sole", () => {
    expect(jointShareLabel("joint", null)).toBe("Joint, 50%");
    expect(jointShareLabel("joint", 40)).toBe("Joint, 40%");
    expect(jointShareLabel("sole", 40)).toBeNull();
  });
});

describe("<EntryOwnershipField />", () => {
  it("shows no share field or label for a sole entry", () => {
    setup();
    expect(screen.queryByLabelText("Your share of Rent")).toBeNull();
    expect(screen.queryByText(/Joint,/)).toBeNull();
  });

  it("marking an entry joint sends 50%, and sole sends no share", () => {
    const { props, rerender } = setup();
    fireEvent.change(screen.getByLabelText("Ownership of Rent"), { target: { value: "joint" } });
    expect(props.onChange).toHaveBeenLastCalledWith("joint", 50);

    rerender(<EntryOwnershipField {...props} ownership="joint" sharePercent={50} />);
    fireEvent.change(screen.getByLabelText("Ownership of Rent"), { target: { value: "sole" } });
    expect(props.onChange).toHaveBeenLastCalledWith("sole", null);
  });

  it("shows the joint label and saves a changed share on blur, clamped to 1 to 100", () => {
    const { props } = setup({ ownership: "joint", sharePercent: 50 });
    expect(screen.getByText("Joint, 50%")).toBeTruthy();
    const share = screen.getByLabelText("Your share of Rent");
    fireEvent.change(share, { target: { value: "140" } });
    fireEvent.blur(share);
    expect(props.onChange).toHaveBeenLastCalledWith("joint", 100);
  });

  it("saves nothing when the share is unchanged or cleared", () => {
    const { props } = setup({ ownership: "joint", sharePercent: 40 });
    const share = screen.getByLabelText("Your share of Rent");
    fireEvent.blur(share);
    fireEvent.change(share, { target: { value: "" } });
    fireEvent.blur(share);
    expect(props.onChange).not.toHaveBeenCalled();
  });
});
