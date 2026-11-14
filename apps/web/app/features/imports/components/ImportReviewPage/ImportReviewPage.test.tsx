import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import {
  COMMITTED_BATCH,
  EXISTING_ACCOUNTS,
  EXPIRED_BATCH,
  PREVIEW,
  REVERTED_BATCH,
  STAGED_BATCH,
} from "../../fixtures";
import type { ImportActions } from "../../useImportActions";
import { ImportReviewPage, type ImportReviewPageProps } from "./ImportReviewPage";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const NOW = new Date("2026-11-14T10:00:00Z");

const makeActions = (over: Partial<ImportActions> = {}): ImportActions => ({
  preview: vi.fn(async () => PREVIEW),
  commit: vi.fn(async () => COMMITTED_BATCH),
  revert: vi.fn(async () => REVERTED_BATCH),
  ...over,
});

const renderPage = (props: Partial<ImportReviewPageProps> = {}) => {
  const actions = props.actions ?? makeActions();
  render(
    <MemoryRouter>
      <ImportReviewPage
        actions={actions}
        batch={STAGED_BATCH}
        existingAccounts={EXISTING_ACCOUNTS}
        initialPreview={PREVIEW}
        now={NOW}
        {...props}
      />
    </MemoryRouter>,
  );
  return actions;
};

describe("ImportReviewPage", () => {
  it("shows the staged import with flagged rows unticked and nothing written", () => {
    const actions = renderPage();
    expect(screen.getByRole("heading", { name: "Review import" })).toBeDefined();
    expect(screen.getByText(/6 monthly balances for 2 accounts/)).toBeDefined();
    expect(screen.getByText("This import expires in 6 days.")).toBeDefined();
    const tick = screen.getByTestId("import-tick-saver:2026-09") as HTMLInputElement;
    expect(tick.checked).toBe(false);
    expect(screen.getByTestId("import-plan").textContent).toBe(
      "3 new balances, 1 replaced, 1 unchanged, 1 skipped.",
    );
    expect(actions.preview).not.toHaveBeenCalled();
    expect(actions.commit).not.toHaveBeenCalled();
  });

  it("commits with the account map and only the ticked flagged rows", async () => {
    const user = userEvent.setup();
    const actions = renderPage();
    await user.click(screen.getByTestId("import-tick-saver:2026-09"));
    expect(screen.getByTestId("import-plan").textContent).toBe(
      "3 new balances, 2 replaced, 1 unchanged.",
    );
    await user.click(screen.getByTestId("import-commit"));
    expect(actions.commit).toHaveBeenCalledWith({ saver: EXISTING_ACCOUNTS[1]?.id, isa: null }, [
      "saver:2026-09",
    ]);
    expect(await screen.findByRole("heading", { name: "Import saved" })).toBeDefined();
    expect(document.activeElement?.id).toBe("import-result");
  });

  it("re-runs the dry run when an account is re-matched", async () => {
    const user = userEvent.setup();
    const actions = renderPage();
    await user.selectOptions(
      screen.getByTestId("import-map-isa"),
      EXISTING_ACCOUNTS[0]?.id as string,
    );
    await waitFor(() =>
      expect(actions.preview).toHaveBeenCalledWith(
        { saver: EXISTING_ACCOUNTS[1]?.id, isa: EXISTING_ACCOUNTS[0]?.id },
        expect.any(AbortSignal),
      ),
    );
  });

  it("does not offer an existing account already chosen for another row", () => {
    renderPage();
    const isa = screen.getByTestId("import-map-isa");
    const labels = within(isa)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(labels).not.toContain("Easy access saver (Saving)");
    expect(labels).toContain("Create a new account");
  });

  it("shows an error and stays on the review when the commit fails", async () => {
    const user = userEvent.setup();
    renderPage({
      actions: makeActions({ commit: vi.fn(async () => Promise.reject(new Error("x"))) }),
    });
    await user.click(screen.getByTestId("import-commit"));
    expect((await screen.findByTestId("import-error")).textContent).toContain(
      "Nothing has changed",
    );
    expect(screen.getByRole("heading", { name: "Review import" })).toBeDefined();
  });

  it("undoes a saved import after confirmation", async () => {
    const user = userEvent.setup();
    const actions = renderPage({ batch: COMMITTED_BATCH, initialPreview: null });
    expect(
      screen.getByText(/3 new balances saved, 1 replaced, 1 unchanged, 1 skipped/),
    ).toBeDefined();
    await user.click(screen.getByTestId("import-undo"));
    await user.click(await screen.findByRole("button", { name: "Undo import" }));
    expect(actions.revert).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("heading", { name: "Import undone" })).toBeDefined();
    expect(screen.getByText("Import undone: 1 restored, 3 removed.")).toBeDefined();
    await waitFor(() => expect(document.activeElement?.id).toBe("import-result"));
    expect(screen.queryByTestId("import-undo")).toBeNull();
  });

  it("explains an expired import with no way to save it", () => {
    renderPage({ batch: EXPIRED_BATCH, initialPreview: null });
    expect(screen.getByText("This import has expired")).toBeDefined();
    expect(screen.queryByTestId("import-commit")).toBeNull();
  });
});
