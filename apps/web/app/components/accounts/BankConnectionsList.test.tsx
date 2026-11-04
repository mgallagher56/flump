import { fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import BankConnectionsList, { type BankConnectionsListProps } from "./BankConnectionsList";

const mockSubmit = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual<any>("react-router");
  return {
    ...actual,
    useFetcher: () => ({
      submit: mockSubmit,
      state: "idle",
      data: null,
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

    expect(getByText("Synced Bank Connections")).toBeDefined();
    expect(getByText("Monzo Bank")).toBeDefined();
    expect(getByText("HSBC UK")).toBeDefined();
    expect(getAllByText(/Synced/i).length).toBeGreaterThan(0);
    expect(getByText(/Error/i)).toBeDefined();
  });

  test("allows syncing a connection", () => {
    const { getAllByText } = customRender(<BankConnectionsList connections={mockConnections} />);

    const syncButtons = getAllByText("Sync Now");
    fireEvent.click(syncButtons[0]);
    expect(mockSubmit).toHaveBeenCalledWith(
      { intent: "syncConnection", connectionId: "conn-1" },
      { method: "POST" },
    );
  });

  test("allows disconnecting a connection after confirmation", () => {
    window.confirm = vi.fn().mockReturnValue(true);
    const { getAllByText } = customRender(<BankConnectionsList connections={mockConnections} />);

    const disconnectButtons = getAllByText("Disconnect");
    fireEvent.click(disconnectButtons[0]);
    expect(window.confirm).toHaveBeenCalled();
    expect(mockSubmit).toHaveBeenCalledWith(
      { intent: "disconnectConnection", connectionId: "conn-1" },
      { method: "POST" },
    );
  });

  test("renders empty state when there are no connections", () => {
    const { getByText } = customRender(<BankConnectionsList connections={[]} />);
    expect(getByText("No Connected Banks")).toBeDefined();
  });

  test("renders mobile variant layout", () => {
    const { getByText } = customRender(
      <BankConnectionsList connections={mockConnections} variant="mobile" />,
    );
    expect(getByText("Monzo Bank")).toBeDefined();
  });
});
