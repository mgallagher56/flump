import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FC } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTaxRecordEditor } from "./useTaxRecordEditor";

// A fetcher the test drives: submit records the form, `land` finishes the save.
const fetcherState = vi.hoisted(() => ({
  state: "idle" as "idle" | "submitting" | "loading",
  data: undefined as unknown,
  submit: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useFetcher: () => ({
      state: fetcherState.state,
      data: fetcherState.data,
      submit: (...args: unknown[]) => {
        fetcherState.submit(...args);
        fetcherState.state = "submitting";
      },
    }),
  };
});

const Page: FC = () => {
  const editor = useTaxRecordEditor({ records: [], taxYear: "2026/27" });
  return (
    <>
      <button onClick={() => editor.openAdd("self-employed", "income")} type="button">
        Open
      </button>
      {editor.dialogs}
    </>
  );
};

describe("useTaxRecordEditor: add and start another (E38 S2)", () => {
  beforeEach(() => {
    fetcherState.state = "idle";
    fetcherState.data = undefined;
    fetcherState.submit.mockClear();
  });

  it("keeps the dialog open on a blank record with the same source after the save lands", async () => {
    const { rerender } = render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog", { name: "Add a record" });
    await userEvent.type(within(dialog).getByLabelText(/^Name/), "Design work");
    await userEvent.type(within(dialog).getByLabelText(/^Amount/), "800");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add and start another" }));
    expect(fetcherState.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "create-transaction",
        name: "Design work",
        amount: "800",
        source: "self-employed",
      }),
      { method: "POST" },
    );

    // The save lands.
    fetcherState.state = "idle";
    fetcherState.data = { success: true };
    rerender(<Page />);

    const still = await screen.findByRole("dialog", { name: "Add a record" });
    expect(within(still).getByRole("status").textContent).toBe(
      "Design work added. Add the next record.",
    );
    expect((within(still).getByLabelText(/^Name/) as HTMLInputElement).value).toBe("");
    expect((within(still).getByLabelText("Income source") as HTMLSelectElement).value).toBe(
      "self-employed",
    );
  });

  it("closes the dialog after Add record, as before", async () => {
    const { rerender } = render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog", { name: "Add a record" });
    await userEvent.type(within(dialog).getByLabelText(/^Name/), "Design work");
    await userEvent.type(within(dialog).getByLabelText(/^Amount/), "800{Enter}");
    expect(fetcherState.submit).toHaveBeenCalledTimes(1);
    fetcherState.state = "idle";
    fetcherState.data = { success: true };
    rerender(<Page />);
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
