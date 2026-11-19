import { render, screen } from "@testing-library/react";
import { PiggyBank } from "lucide-react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { SampleModeProvider } from "~/context/SampleModeContext";
import { SECTION_PRIORITY } from "../../sectionOrder";
import { WidgetCard, type WidgetCardProps } from "./WidgetCard";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const props: WidgetCardProps = {
  id: "savings",
  title: "Savings",
  icon: PiggyBank,
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
    expect(screen.getByText(props.line as string)).toBeTruthy();
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

  it("draws its section's colour on the top edge and the icon tile, with stretched-link styling", () => {
    renderCard({}, false);
    const card = screen.getByTestId("widget-card-savings");
    expect(card.getAttribute("data-section-colour")).toBe("sage");
    expect(card.className).toContain("bd-t-c_chart.series2");
    expect(card.querySelector('[data-tile-tone="sage"]')).toBeTruthy();
    expect(card.className).toContain("cursor_pointer");
    const link = screen.getByTestId("widget-card-savings-link");
    expect(link.className).toContain("inset_0");
  });

  it("gives every section a top edge of the same weight, so none looks missing", () => {
    for (const id of SECTION_PRIORITY) {
      const { unmount } = renderCard({ id });
      const card = screen.getByTestId(`widget-card-${id}`);
      expect(card.className).toContain("bd-t-w_4px");
      expect(card.className).not.toMatch(/bd-t-c_(surface|border)/);
      unmount();
    }
  });
});
