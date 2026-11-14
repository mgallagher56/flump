import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataTab } from "./DataTab";

const mockResetFinancialData = vi.fn().mockResolvedValue(undefined);

const fetcher = vi.hoisted(() => ({
  state: "idle" as "idle" | "submitting" | "loading",
  data: undefined as unknown,
  submit: (() => undefined) as (...args: unknown[]) => unknown,
}));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useFetcher: () => fetcher,
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
    fetcher.state = "idle";
    fetcher.data = undefined;
    fetcher.submit = vi.fn();
  });

  it("offers a data download and account deletion alongside the data deletion", () => {
    render(<DataTab />);
    expect(screen.getByRole("heading", { name: "Download your data" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Delete your account" })).toBeDefined();
  });

  it("posts the delete intent and the DELETE phrase to the settings route", () => {
    render(<DataTab />);
    fireEvent.click(screen.getByTestId("delete-account-trigger"));
    fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "DELETE" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    expect(fetcher.submit).toHaveBeenCalledWith(
      { intent: "delete-account", confirmation: "DELETE" },
      { method: "post", action: "/app/profile" },
    );
  });

  it("shows the identity_pending outcome from the action", () => {
    fetcher.data = { outcome: "identity_pending" };
    render(<DataTab />);
    fireEvent.click(screen.getByTestId("delete-account-trigger"));
    expect(screen.getByRole("alert").textContent).toContain("could not finish removing your login");
  });

  it("labels the section with Delete wording; danger styling waits for the confirmation (D3)", () => {
    render(<DataTab />);
    expect(screen.getByRole("heading", { name: "Delete your financial data" })).toBeDefined();
    const trigger = screen.getByTestId("reset-financial-data-trigger");
    expect(trigger.textContent).toBe("Delete all data");
    expect(trigger.getAttribute("data-variant")).toBe("outline");
    expect(screen.getByTestId("delete-account-trigger").getAttribute("data-variant")).toBe(
      "outline",
    );
  });

  it("does nothing until the reset is confirmed", () => {
    render(<DataTab />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(mockResetFinancialData).not.toHaveBeenCalled();
  });

  it("requires typing RESET to confirm", async () => {
    render(<DataTab />);
    fireEvent.click(screen.getByTestId("reset-financial-data-trigger"));
    expect(screen.getByText("Delete all your financial data?", { selector: "h2" })).toBeDefined();

    const confirmBtn = screen.getByRole("button", {
      name: "Delete all data",
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
    const confirmBtn = screen.getByRole("button", { name: "Delete all data" });
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);
    expect(mockResetFinancialData).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() => expect(screen.getByText("All financial data deleted")).toBeDefined());
  });

  it("shows the fixed failure message, never the server's, and keeps the dialog open", async () => {
    mockResetFinancialData.mockRejectedValueOnce(new Error("Reset failed on the server"));
    render(<DataTab />);
    fireEvent.click(screen.getByTestId("reset-financial-data-trigger"));
    fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "RESET" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete all data" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(
      "We could not delete your financial data. Nothing has changed. Try again.",
    );
    expect(alert.textContent).not.toContain("Reset failed on the server");
    expect(screen.getByRole("alertdialog")).toBeDefined();
  });

  it("asks for a fresh sign-in when the reset needs a recent login", async () => {
    const { RecentLoginRequiredError } = await import("~/hooks/useUserProfile");
    mockResetFinancialData.mockRejectedValueOnce(new RecentLoginRequiredError());
    render(<DataTab />);
    fireEvent.click(screen.getByTestId("reset-financial-data-trigger"));
    fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "RESET" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete all data" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "For your security, sign in again, then try again.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign in again" }));
    expect(fetcher.submit).toHaveBeenCalledWith(
      { next: "/app/profile?tab=data" },
      { method: "post", action: "/logout" },
    );
  });

  it("cancelling does not reset anything", () => {
    render(<DataTab />);
    fireEvent.click(screen.getByTestId("reset-financial-data-trigger"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockResetFinancialData).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
