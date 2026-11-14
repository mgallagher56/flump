import { render, screen } from "@testing-library/react";
import { PiggyBank } from "lucide-react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { SampleModeProvider } from "~/context/SampleModeContext";
import { WidgetCard, type WidgetCardProps } from "./WidgetCard";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const props: WidgetCardProps = {
  id: "savings",
  title: "Savings",
  icon: PiggyBank,
  domain: "savings",
  label: "Savings and investments",
  figure: "£12,000",
  line: "Across your savings and investment accounts.",
  link: { to: "/app/savings", label: "Open savings" },
};

const renderCard = (overrides: Partial<WidgetCardProps> = {}, sample = false) =>
  render(
    <MemoryRouter>
      <SampleModeProvider value={sample}>
        <WidgetCard {...props} {...overrides} />
      </SampleModeProvider>
    </MemoryRouter>,
  );

describe("WidgetCard", () => {
  it("shows one figure, one line and one link under the section heading", () => {
    renderCard();
    expect(screen.getByRole("heading", { level: 3, name: "Savings" })).toBeTruthy();
    expect(screen.getByText("£12,000")).toBeTruthy();
    expect(screen.getByText(props.line)).toBeTruthy();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/app/savings");
    expect(links[0].textContent).toContain("Open savings");
  });

  it('shows "Not set" when the figure is unknown', () => {
    renderCard({ figure: null });
    expect(screen.getByText("Not set").getAttribute("data-unknown")).toBe("true");
  });

  it("shows a lock and no link in the sandbox", () => {
    renderCard({}, true);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("img", { name: "Locked in this example" })).toBeTruthy();
  });
});
