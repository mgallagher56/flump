import { fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import ConnectBankWizard from "./ConnectBankWizard";

const fetcherState = vi.hoisted(() => ({ data: null as unknown }));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useFetcher: () => ({
      submit: vi.fn(),
      state: "idle",
      data: fetcherState.data,
      Form: ({ children }: { children: ReactNode }) => <form>{children}</form>,
    }),
  };
});

describe("<ConnectBankWizard />", () => {
  afterEach(() => {
    fetcherState.data = null;
    vi.unstubAllGlobals();
  });

  test("navigates to an https OAuth redirect URL", () => {
    const location = { href: "" };
    vi.stubGlobal("location", location);
    const { rerender } = customRender(<ConnectBankWizard />);
    fetcherState.data = { success: true, oauth: true, redirectUrl: "https://bank.example.test/a" };
    rerender(<ConnectBankWizard />);
    expect(location.href).toBe("https://bank.example.test/a");
  });

  test.each(["javascript:alert(1)", "http://bank.example.test/a"])(
    "rejects %s without navigating and shows the error step",
    (redirectUrl) => {
      const location = { href: "" };
      vi.stubGlobal("location", location);
      const { getByText, rerender } = customRender(<ConnectBankWizard />);
      fireEvent.click(getByText("Connect a bank"));
      fireEvent.click(getByText("Monzo Bank"));
      fetcherState.data = { success: true, oauth: true, redirectUrl };
      rerender(<ConnectBankWizard />);
      expect(location.href).toBe("");
      expect(
        getByText("We could not start the bank sign-in. Nothing was connected. Try again."),
      ).toBeDefined();
    },
  );

  test("names the dialog on each step and uses buttons for choices", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    customRender(<ConnectBankWizard />);
    fireEvent.click(screen.getByText("Connect a bank"));
    expect(screen.getByRole("dialog", { name: /connect a bank/i })).toBeDefined();

    const monzo = screen.getByRole("button", { name: /Monzo Bank/ });
    expect(monzo.tagName).toBe("BUTTON");
    fireEvent.click(monzo);
    expect(screen.getByRole("dialog", { name: /choose how to connect/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /^Access token/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /^Bank sign-in/ })).toBeDefined();

    const radixWarnings = errorSpy.mock.calls.filter((c) => String(c[0]).includes("DialogContent"));
    expect(radixWarnings).toHaveLength(0);
    errorSpy.mockRestore();
  });

  test("opens dialog and allows selecting a bank and proceeding through steps", async () => {
    const { getByText, getByLabelText, queryByText } = customRender(<ConnectBankWizard />);

    // Trigger button
    const connectBtn = getByText("Connect a bank");
    expect(connectBtn).toBeDefined();
    fireEvent.click(connectBtn);

    // Dialog title
    expect(getByText("Choose your bank. Bank connection is a preview.")).toBeDefined();

    // No "Live" badge on any bank: bank connection is a preview (ruling 4)
    expect(queryByText("Live")).toBeNull();

    // Filter banks
    const searchInput = getByLabelText("Search banks");
    fireEvent.change(searchInput, { target: { value: "Starling" } });
    expect(getByText("Starling Bank")).toBeDefined();
    expect(queryByText("Monzo Bank")).toBeNull();

    // Select Starling
    fireEvent.click(getByText("Starling Bank"));
    expect(getByText("Choose how to connect")).toBeDefined();

    // Select Access token
    fireEvent.click(getByText("Access token"));
    expect(getByText("Starling Bank access token")).toBeDefined();
    expect(
      getByText("Preview: paste your own read-only access token from your provider."),
    ).toBeDefined();

    // Click back
    fireEvent.click(getByText("Back"));
    expect(getByText("Choose how to connect")).toBeDefined();
  });

  test("supports selecting Monzo access token flow", () => {
    const { getByText, getByPlaceholderText } = customRender(
      <ConnectBankWizard onSuccess={vi.fn()} />,
    );

    fireEvent.click(getByText("Connect a bank"));
    fireEvent.click(getByText("Monzo Bank"));
    fireEvent.click(getByText("Access token"));
    expect(getByText("Monzo Bank access token")).toBeDefined();
    expect(getByPlaceholderText("For example, eyJ…")).toBeDefined();

    fireEvent.click(getByText("Back"));
    expect(getByText("Choose how to connect")).toBeDefined();
  });

  test("supports selecting Trading 212 API key connection flow", () => {
    const { getByText, getByLabelText } = customRender(<ConnectBankWizard onSuccess={vi.fn()} />);

    fireEvent.click(getByText("Connect a bank"));
    fireEvent.click(getByText("Trading 212"));
    fireEvent.click(getByText("Access token"));
    expect(getByText("Trading 212 access token")).toBeDefined();
    expect(getByLabelText("Trading 212 API key")).toBeDefined();

    // Click back
    fireEvent.click(getByText("Back"));
    expect(getByText("Choose how to connect")).toBeDefined();
  });
});
