import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataTab } from "./DataTab";

const mockResetFinancialData = vi.fn().mockResolvedValue(undefined);

vi.mock("~/hooks/useUserProfile", async () => {
  const actual: typeof import("~/hooks/useUserProfile") =
    await vi.importActual("~/hooks/useUserProfile");
  return {
    ...actual,
    useUserProfile: () => ({
      profile: actual.DEFAULT_PROFILE,
      resetFinancialData: mockResetFinancialData,
    }),
  };
});

describe("<DataTab />", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing until the reset is confirmed", () => {
    render(<DataTab />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(mockResetFinancialData).not.toHaveBeenCalled();
  });

  it("requires typing RESET to confirm", async () => {
    render(<DataTab />);
    fireEvent.click(screen.getByTestId("reset-financial-data-trigger"));
    expect(screen.getByText("Reset all financial data", { selector: "h2" })).toBeDefined();

    const confirmBtn = screen.getByRole("button", {
      name: "Reset everything",
    }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "nope" } });
    expect(confirmBtn.disabled).toBe(true);
    fireEvent.click(confirmBtn);
    expect(mockResetFinancialData).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "reset" } });
    expect(confirmBtn.disabled).toBe(false);
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(mockResetFinancialData).toHaveBeenCalledTimes(1));
  });

  it("resets once even when confirm is clicked twice quickly", async () => {
    let release: () => void = () => {};
    mockResetFinancialData.mockImplementationOnce(
      () => new Promise<void>((resolve) => (release = resolve)),
    );
    render(<DataTab />);
    fireEvent.click(screen.getByTestId("reset-financial-data-trigger"));
    fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "RESET" } });
    const confirmBtn = screen.getByRole("button", { name: "Reset everything" });
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);
    expect(mockResetFinancialData).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() => expect(screen.getByText(/clean slate/i)).toBeDefined());
  });

  it("shows a failure inside the dialog and keeps it open", async () => {
    mockResetFinancialData.mockRejectedValueOnce(new Error("Reset failed on the server"));
    render(<DataTab />);
    fireEvent.click(screen.getByTestId("reset-financial-data-trigger"));
    fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "RESET" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset everything" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Reset failed on the server");
    expect(screen.getByRole("alertdialog")).toBeDefined();
  });

  it("cancelling does not reset anything", () => {
    render(<DataTab />);
    fireEvent.click(screen.getByTestId("reset-financial-data-trigger"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockResetFinancialData).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
