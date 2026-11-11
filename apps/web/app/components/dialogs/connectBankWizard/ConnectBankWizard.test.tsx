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
      fireEvent.click(getByText("Connect Bank Account"));
      fireEvent.click(getByText("Monzo Bank"));
      fetcherState.data = { success: true, oauth: true, redirectUrl };
      rerender(<ConnectBankWizard />);
      expect(location.href).toBe("");
      expect(getByText("We couldn't start the bank sign-in. Please try again.")).toBeDefined();
    },
  );

  test("names the dialog on each step and uses buttons for choices", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    customRender(<ConnectBankWizard />);
    fireEvent.click(screen.getByText("Connect Bank Account"));
    expect(screen.getByRole("dialog", { name: /connect bank account/i })).toBeDefined();

    const monzo = screen.getByRole("button", { name: /Monzo Bank/ });
    expect(monzo.tagName).toBe("BUTTON");
    fireEvent.click(monzo);
    expect(screen.getByRole("dialog", { name: /choose connection mode/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Personal Access Token/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /OAuth 2.0/ })).toBeDefined();

    const radixWarnings = errorSpy.mock.calls.filter((c) => String(c[0]).includes("DialogContent"));
    expect(radixWarnings).toHaveLength(0);
    errorSpy.mockRestore();
  });

  test("opens dialog and allows selecting a bank and proceeding through steps", async () => {
    const { getByText, getByPlaceholderText, queryByText } = customRender(<ConnectBankWizard />);

    // Trigger button
    const connectBtn = getByText("Connect Bank Account");
    expect(connectBtn).toBeDefined();
    fireEvent.click(connectBtn);

    // Dialog title
    expect(
      getByText("Choose your bank or financial institution. Bank connection is a preview."),
    ).toBeDefined();

    // Filter banks
    const searchInput = getByPlaceholderText("Search your bank...");
    fireEvent.change(searchInput, { target: { value: "Starling" } });
    expect(getByText("Starling Bank")).toBeDefined();
    expect(queryByText("Monzo Bank")).toBeNull();

    // Select Starling
    fireEvent.click(getByText("Starling Bank"));
    expect(getByText("Choose Connection Mode")).toBeDefined();

    // Select Personal Access Token
    fireEvent.click(getByText("Personal Access Token (Recommended)"));
    expect(getByText("Starling Bank Developer Token")).toBeDefined();
    expect(
      getByText("Preview: paste your own read-only access token from your provider."),
    ).toBeDefined();

    // Click back
    fireEvent.click(getByText("Back"));
    expect(getByText("Choose Connection Mode")).toBeDefined();
  });

  test("supports selecting Monzo developer token flow", () => {
    const { getByText, getByPlaceholderText } = customRender(
      <ConnectBankWizard onSuccess={vi.fn()} />,
    );

    fireEvent.click(getByText("Connect Bank Account"));
    fireEvent.click(getByText("Monzo Bank"));
    fireEvent.click(getByText("Personal Access Token (Recommended)"));
    expect(getByText("Monzo Bank Developer Token")).toBeDefined();
    expect(getByPlaceholderText(/Monzo access token/i)).toBeDefined();

    fireEvent.click(getByText("Back"));
    expect(getByText("Choose Connection Mode")).toBeDefined();
  });

  test("supports selecting Trading 212 API key connection flow", () => {
    const { getByText, getByPlaceholderText } = customRender(
      <ConnectBankWizard onSuccess={vi.fn()} />,
    );

    fireEvent.click(getByText("Connect Bank Account"));
    fireEvent.click(getByText("Trading 212"));
    fireEvent.click(getByText("Personal Access Token (Recommended)"));
    expect(getByText("Trading 212 Developer Token")).toBeDefined();
    expect(getByPlaceholderText(/Trading 212 API key/i)).toBeDefined();

    // Click back
    fireEvent.click(getByText("Back"));
    expect(getByText("Choose Connection Mode")).toBeDefined();
  });
});
