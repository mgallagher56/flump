import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Account } from "~/containers/accounts/types";
import customRender from "~/testUtils/customRender";
import { SavingsAccountsList } from "./SavingsAccountsList";

const mockSubmit = vi.fn();
const fetcherData = { current: null as unknown };
vi.mock("react-router", async () => {
  const actual = await vi.importActual<any>("react-router");
  return {
    ...actual,
    useFetcher: () => ({
      submit: mockSubmit,
      state: "idle",
      data: fetcherData.current,
    }),
    useNavigate: () => vi.fn(),
    Link: ({ to, children, ...rest }: any) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

describe("<SavingsAccountsList />", () => {
  const mockAccounts: Account[] = [
    {
      id: "acc-1",
      name: "High Yield Saver",
      type: "Savings",
      balance: 10000.4,
      interestRate: 4.75,
      monthlyContribution: 250,
      created_at: "2026-01-01",
      user_id: "u1",
    },
  ];

  test("shows one figure per row: the balance in whole pounds", () => {
    const { container } = customRender(<SavingsAccountsList accounts={mockAccounts} />);
    expect(screen.getByText("Your accounts")).toBeDefined();
    const row = container.querySelector("[data-list-row]") as HTMLElement;
    expect(row.textContent).toContain("High Yield Saver");
    expect(row.textContent).toContain("£10,000");
    expect(row.textContent).not.toContain("4.75%");
    expect(row.textContent).not.toContain("£250");
    expect(screen.getByRole("link", { name: "High Yield Saver" }).getAttribute("href")).toBe(
      "/app/accounts/acc-1",
    );
  });

  test("shows the ISA bar as a quiet footer with one sentence and no second figure", () => {
    const { container } = customRender(
      <SavingsAccountsList accounts={mockAccounts} isaUsed={1600} />,
    );
    const bar = screen.getByRole("progressbar", { name: "ISA allowance used this tax year" });
    expect(bar.getAttribute("aria-valuetext")).toBe("Estimate: £1,600 of £20,000 used");
    expect(screen.getByTestId("isa-allowance").textContent).toContain(
      "The allowance resets each tax year on 6 April.",
    );
    expect(container.textContent).not.toContain("£1,600");
    expect(container.textContent).not.toContain("unused");
  });

  test("leaves the ISA bar out when no use is known", () => {
    customRender(<SavingsAccountsList accounts={mockAccounts} isaUsed={null} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  test("has no number inputs (money is edited in the account form)", () => {
    const { container } = customRender(<SavingsAccountsList accounts={mockAccounts} />);
    expect(container.querySelector('input[type="number"]')).toBeNull();
  });

  test("keeps accounts past the eighth behind a drawer", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      ...mockAccounts[0],
      id: `acc-${i}`,
      name: `Account ${i}`,
    }));
    customRender(<SavingsAccountsList accounts={many} />);
    expect(screen.getByText("2 more accounts")).toBeDefined();
  });

  test("opens the edit form for an account", () => {
    customRender(<SavingsAccountsList accounts={mockAccounts} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit High Yield Saver" }));
    expect(screen.getByRole("dialog", { name: "Edit savings account" })).toBeDefined();
  });

  describe("delete confirmation", () => {
    // Delete lives inside the account's edit dialog: Edit, then "Delete account", then confirm.
    const openDelete = () => {
      fireEvent.click(screen.getByRole("button", { name: "Edit High Yield Saver" }));
      fireEvent.click(
        within(screen.getByRole("dialog", { name: "Edit savings account" })).getByRole("button", {
          name: "Delete account",
        }),
      );
    };

    test("each row has one Edit button and no delete button", () => {
      customRender(<SavingsAccountsList accounts={mockAccounts} />);
      expect(screen.getByRole("button", { name: "Edit High Yield Saver" })).toBeDefined();
      expect(screen.queryByRole("button", { name: /^Delete / })).toBeNull();
    });

    beforeEach(() => {
      mockSubmit.mockClear();
      fetcherData.current = null;
    });

    test("a failed delete shows the error inline and keeps the dialog open; success closes it", () => {
      const ui = () => <SavingsAccountsList accounts={mockAccounts} />;
      const { rerender } = customRender(ui());
      openDelete();
      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
      expect(screen.getByRole("button", { name: "Delete account" }).hasAttribute("disabled")).toBe(
        true,
      );

      fetcherData.current = {
        success: false,
        error: "We couldn't reach the server. Please try again.",
      };
      rerender(ui());
      expect(within(screen.getByRole("alertdialog")).getByRole("alert").textContent).toBe(
        "We couldn't reach the server. Please try again.",
      );

      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
      fetcherData.current = { success: true };
      rerender(ui());
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    test("Delete account in the edit dialog opens the confirm and submits nothing", () => {
      const confirmSpy = vi.fn();
      vi.stubGlobal("confirm", confirmSpy);
      customRender(<SavingsAccountsList accounts={mockAccounts} />);
      openDelete();
      const dialog = screen.getByRole("alertdialog", { name: "Delete High Yield Saver?" });
      expect(
        within(dialog).getByText("Its balance history will be deleted too. This cannot be undone."),
      ).toBeDefined();
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    test("confirm deletes once", () => {
      customRender(<SavingsAccountsList accounts={mockAccounts} />);
      openDelete();
      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockSubmit).toHaveBeenCalledWith(
        { intent: "deleteAccount", accountId: "acc-1" },
        { method: "POST", action: "/app/savings" },
      );
    });

    test("cancel does nothing", () => {
      customRender(<SavingsAccountsList accounts={mockAccounts} />);
      openDelete();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
