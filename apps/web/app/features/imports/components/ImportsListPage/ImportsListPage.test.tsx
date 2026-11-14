import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { BATCH_LIST, STAGED_BATCH } from "../../fixtures";
import { ImportsListPage } from "./ImportsListPage";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const renderList = (batches = BATCH_LIST) =>
  render(
    <MemoryRouter>
      <ImportsListPage batches={batches} />
    </MemoryRouter>,
  );

describe("ImportsListPage", () => {
  it("lists each import with its status, outcome and a link to it", () => {
    renderList();
    expect(screen.getAllByText("Ready to review").length).toBeGreaterThan(0);
    expect(screen.getByText("6 monthly balances to review")).toBeDefined();
    expect(screen.getByText("4 saved")).toBeDefined();
    expect(screen.getByText("Cleared without saving")).toBeDefined();
    const review = screen.getByTestId(`import-open-${BATCH_LIST[0]?.batchId}`);
    expect(review.getAttribute("href")).toBe(`/app/imports/${BATCH_LIST[0]?.batchId}`);
    expect(review.textContent).toBe("Review");
  });

  it("shows an empty state with no imports", () => {
    renderList([]);
    expect(screen.getByText("No imports yet")).toBeDefined();
  });

  it("puts more than 8 imports in a drawer", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      ...STAGED_BATCH,
      batchId: `b0000000-0000-4000-8000-00000000001${i}`,
    }));
    renderList(many);
    expect(screen.getByText("All imports")).toBeDefined();
  });
});
