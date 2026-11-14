import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LONG_PREVIEW, PREVIEW_ACCOUNTS, PREVIEW_ROWS } from "../../fixtures";
import { ImportDiffTable } from "./ImportDiffTable";

describe("ImportDiffTable", () => {
  it("lists flagged rows with an unticked replace box and reports ticks", async () => {
    const onToggle = vi.fn();
    render(
      <ImportDiffTable
        accounts={PREVIEW_ACCOUNTS}
        onToggle={onToggle}
        rows={PREVIEW_ROWS}
        ticked={new Set()}
      />,
    );
    const tick = screen.getByRole("checkbox", { name: /Replace the value you entered/ });
    expect((tick as HTMLInputElement).checked).toBe(false);
    expect(screen.getAllByText("Kept unless ticked").length).toBe(1);
    await userEvent.setup().click(tick);
    expect(onToggle).toHaveBeenCalledWith("saver:2026-09", true);
  });

  it("shows a ticked row as replacing", () => {
    render(
      <ImportDiffTable
        accounts={PREVIEW_ACCOUNTS}
        onToggle={vi.fn()}
        rows={PREVIEW_ROWS}
        ticked={new Set(["saver:2026-09"])}
      />,
    );
    expect(screen.getAllByText("Will replace").length).toBe(1);
  });

  it("puts more than 8 rows in a drawer and has no flagged list when nothing is flagged", () => {
    render(
      <ImportDiffTable
        accounts={PREVIEW_ACCOUNTS}
        onToggle={vi.fn()}
        rows={LONG_PREVIEW.rows}
        ticked={new Set()}
      />,
    );
    expect(screen.getByText("All changes")).toBeDefined();
    expect(screen.queryByTestId("import-flagged")).toBeNull();
  });
});
