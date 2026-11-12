import { fireEvent, render, screen } from "@testing-library/react";
import { Landmark } from "lucide-react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { WidgetCard } from "./WidgetCard";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const renderCard = (onHide?: () => void) =>
  render(
    <MemoryRouter>
      <WidgetCard
        href="/app/accounts"
        icon={Landmark}
        id="accounts"
        title="Accounts"
        onHide={onHide}
      >
        <p>Slot content</p>
      </WidgetCard>
    </MemoryRouter>,
  );

describe("<WidgetCard />", () => {
  it("renders the title, slot content and an Open link", () => {
    renderCard();
    expect(screen.getByRole("heading", { name: "Accounts" })).toBeDefined();
    expect(screen.getByText("Slot content")).toBeDefined();
    expect(screen.getByRole("link", { name: "Open Accounts" }).getAttribute("href")).toBe(
      "/app/accounts",
    );
  });

  it("omits the hide button unless onHide is given", () => {
    renderCard();
    expect(screen.queryByRole("button", { name: "Hide Accounts" })).toBeNull();
  });

  it("calls onHide when the hide button is pressed", () => {
    const onHide = vi.fn();
    renderCard(onHide);
    fireEvent.click(screen.getByRole("button", { name: "Hide Accounts" }));
    expect(onHide).toHaveBeenCalledOnce();
  });
});
