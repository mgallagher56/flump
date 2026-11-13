import { fireEvent, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import BankConnectionsList, { type BankConnectionsListProps } from "./BankConnectionsList";

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
    useRevalidator: () => ({
      revalidate: vi.fn(),
      state: "idle",
    }),
  };
});

describe("<BankConnectionsList />", () => {
  const mockConnections: BankConnectionsListProps["connections"] = [
    {
      id: "conn-1",
      institutionId: "monzo",
      institutionName: "Monzo Bank",
      status: "connected",
      lastSyncedAt: "2026-11-04T12:00:00Z",
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "conn-2",
      institutionId: "hsbc",
      institutionName: "HSBC UK",
      status: "error",
      lastSyncedAt: "2026-11-03T10:00:00Z",
      createdAt: "2026-01-01T00:00:00Z",
    },
  ];

  test("renders active connections and their statuses", () => {
    const { getByText, getAllByText } = customRender(
      <BankConnectionsList connections={mockConnections} />,
    );

    expect(getByText("Synced bank connections")).toBeDefined();
    expect(getByText("Monzo Bank")).toBeDefined();
    expect(getByText("HSBC UK")).toBeDefined();
    expect(getAllByText(/Synced/i).length).toBeGreaterThan(0);
    expect(getByText(/Error/i)).toBeDefined();
  });

  test("names each action after its bank and labels a disconnected feed as Disconnected", () => {
    const { getByRole, getByText } = customRender(
      <BankConnectionsList
        connections={[{ ...mockConnections[0], status: "disconnected" }, mockConnections[1]]}
      />,
    );
    expect(getByRole("button", { name: "Sync Monzo Bank" })).toBeDefined();
    expect(getByRole("button", { name: "Disconnect HSBC UK" })).toBeDefined();
    expect(getByText("Disconnected")).toBeDefined();
  });

  test("shows one connect entry point when the list is empty", () => {
    const { getAllByText } = customRender(<BankConnectionsList canConnect connections={[]} />);
    expect(getAllByText("Connect bank account")).toHaveLength(1);
  });

  test("allows syncing a connection", () => {
    const { getAllByText } = customRender(<BankConnectionsList connections={mockConnections} />);

    const syncButtons = getAllByText("Sync now");
    fireEvent.click(syncButtons[0]);
    expect(mockSubmit).toHaveBeenCalledWith(
      { intent: "syncConnection", connectionId: "conn-1" },
      { method: "POST" },
    );
  });

  test("disconnect opens a confirm dialog and submits nothing until confirmed", () => {
    const confirmSpy = vi.fn();
    window.confirm = confirmSpy;
    mockSubmit.mockClear();
    const { getAllByText, getByRole } = customRender(
      <BankConnectionsList connections={mockConnections} />,
    );

    fireEvent.click(getAllByText("Disconnect")[0]);
    const dialog = getByRole("alertdialog", { name: "Disconnect Monzo Bank?" });
    expect(dialog.textContent).toContain(
      "Synced accounts and transactions from this bank will be removed.",
    );
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  test("cancelling the disconnect confirm submits nothing", () => {
    mockSubmit.mockClear();
    const { getAllByText, getByRole, queryByRole } = customRender(
      <BankConnectionsList connections={mockConnections} />,
    );
    fireEvent.click(getAllByText("Disconnect")[0]);
    fireEvent.click(getByRole("button", { name: "Cancel" }));
    expect(queryByRole("alertdialog")).toBeNull();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  test("confirming disconnect submits disconnectConnection", () => {
    mockSubmit.mockClear();
    const { getAllByText, getByRole } = customRender(
      <BankConnectionsList connections={mockConnections} />,
    );
    fireEvent.click(getAllByText("Disconnect")[1]);
    const dialog = getByRole("alertdialog", { name: "Disconnect HSBC UK?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Disconnect" }));
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith(
      { intent: "disconnectConnection", connectionId: "conn-2" },
      { method: "POST" },
    );
  });

  test("a failed disconnect shows the error inline and keeps the dialog open; success closes it", () => {
    mockSubmit.mockClear();
    fetcherData.current = null;
    const ui = () => <BankConnectionsList connections={mockConnections} />;
    const { getAllByText, getByRole, queryByRole, rerender } = customRender(ui());
    fireEvent.click(getAllByText("Disconnect")[0]);
    fireEvent.click(
      within(getByRole("alertdialog", { name: "Disconnect Monzo Bank?" })).getByRole("button", {
        name: "Disconnect",
      }),
    );

    fetcherData.current = {
      success: false,
      error: "We couldn't reach the server. Please try again.",
    };
    rerender(ui());
    expect(within(getByRole("alertdialog")).getByRole("alert").textContent).toBe(
      "We couldn't reach the server. Please try again.",
    );

    fireEvent.click(within(getByRole("alertdialog")).getByRole("button", { name: "Disconnect" }));
    fetcherData.current = { success: true };
    rerender(ui());
    expect(queryByRole("alertdialog")).toBeNull();
    fetcherData.current = null;
  });

  test("renders empty state when there are no connections", () => {
    const { getByText } = customRender(<BankConnectionsList connections={[]} canConnect />);
    expect(getByText("No connected banks")).toBeDefined();
  });

  test("shows no connect entry point unless connecting is enabled for the account", () => {
    const { queryByText, getByText } = customRender(
      <BankConnectionsList connections={mockConnections} />,
    );
    expect(queryByText("Connect Bank")).toBeNull();
    expect(getByText("Monzo Bank")).toBeDefined();
  });

  test("renders nothing when there are no connections and connecting is not enabled", () => {
    const { container } = customRender(<BankConnectionsList connections={[]} />);
    expect(container.textContent).not.toContain("Bank Connections");
    expect(container.textContent).not.toContain("No connected banks");
  });
});
