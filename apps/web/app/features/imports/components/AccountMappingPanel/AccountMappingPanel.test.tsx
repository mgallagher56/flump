import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EXISTING_ACCOUNTS, PREVIEW_ACCOUNTS } from "../../fixtures";
import { AccountMappingPanel } from "./AccountMappingPanel";

const SAVER = EXISTING_ACCOUNTS[1]?.id as string;
const CURRENT = EXISTING_ACCOUNTS[0]?.id as string;

describe("AccountMappingPanel", () => {
  it("labels each staged account, shows the match and reports changes", async () => {
    const onChange = vi.fn();
    render(
      <AccountMappingPanel
        accounts={PREVIEW_ACCOUNTS}
        existing={EXISTING_ACCOUNTS}
        map={{ saver: SAVER, isa: null }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Matched by name and type")).toBeDefined();
    const isa = screen.getByLabelText("Stocks ISA");
    expect((isa as HTMLSelectElement).value).toBe("__new__");
    await userEvent.setup().selectOptions(isa, CURRENT);
    expect(onChange).toHaveBeenCalledWith("isa", CURRENT);
    await userEvent.setup().selectOptions(screen.getByLabelText("Easy access saver"), "__new__");
    expect(onChange).toHaveBeenLastCalledWith("saver", null);
  });

  it("hides an account already chosen for another staged account", () => {
    render(
      <AccountMappingPanel
        accounts={PREVIEW_ACCOUNTS}
        existing={EXISTING_ACCOUNTS}
        map={{ saver: SAVER, isa: null }}
        onChange={vi.fn()}
      />,
    );
    const options = within(screen.getByLabelText("Stocks ISA")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).not.toContain("Easy access saver (Saving)");
  });
});
