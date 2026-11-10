import { fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import ConnectBankWizard from "./ConnectBankWizard";

describe("<ConnectBankWizard />", () => {
  test("opens dialog and allows selecting a bank and proceeding through steps", async () => {
    const { getByText, getByPlaceholderText, queryByText } = customRender(<ConnectBankWizard />);

    // Trigger button
    const connectBtn = getByText("Connect Bank Account");
    expect(connectBtn).toBeDefined();
    fireEvent.click(connectBtn);

    // Dialog title
    expect(
      getByText("Choose your bank or financial institution to automatically sync your balances."),
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
});
