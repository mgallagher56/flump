import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import type { BudgetEntry } from "~/types/budget";
import {
  type DraftBudgetEntry,
  entryFromDraft,
  exampleBudgetDrafts,
  isDraftReady,
} from "../../exampleDrafts";
import { sampleBudgetEntries } from "../../sampleBudgetEntries";
import { BudgetEditor, type BudgetEditorProps } from "./BudgetEditor";

/** Holds the entries in story state so saves, adds and removes show on the page. */
const Stateful = (args: BudgetEditorProps) => {
  const [entries, setEntries] = useState<BudgetEntry[]>(args.entries);
  return (
    <BudgetEditor
      {...args}
      entries={entries}
      onAdd={async (entry) => {
        await args.onAdd(entry);
        setEntries((prev) => [
          ...prev,
          { ...entry, id: `new-${prev.length}`, userId: "u1", createdAt: "", updatedAt: "" },
        ]);
      }}
      onDelete={async (id) => {
        await args.onDelete(id);
        setEntries((prev) => prev.filter((e) => e.id !== id));
        return true;
      }}
      onUpdate={async (id, update) => {
        await args.onUpdate(id, update);
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...update } : e)));
      }}
    />
  );
};

const meta: Meta<typeof BudgetEditor> = {
  title: "3. Patterns/Budget/BudgetEditor",
  component: BudgetEditor,
  parameters: { layout: "padded" },
  args: {
    categories: ["housing", "bills", "expenses", "savings", "income", "transport"],
    entries: sampleBudgetEntries(),
    onAdd: fn(async () => undefined),
    onUpdate: fn(async () => undefined),
    onDelete: fn(async () => true),
  },
  render: (args) => <Stateful {...args} />,
};

export default meta;
type Story = StoryObj<typeof BudgetEditor>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const editor = canvas.getAllByTestId("budget-editor")[0];
    if (!editor) throw new Error("Editor missing");
    const scoped = within(editor);
    const headings = scoped.getAllByRole("heading", { level: 3 });
    await expect(headings[0]).toHaveTextContent("Money in");

    // Adding a bill opens the add row, saves it and closes the row again.
    await userEvent.click(scoped.getByRole("button", { name: "Add to bills" }));
    const name = scoped.getByLabelText("New entry name in Bills");
    await userEvent.type(name, "Water");
    await userEvent.click(scoped.getByRole("button", { name: "Add to Bills" }));
    await waitFor(() => expect(args.onAdd).toHaveBeenCalled());
    await waitFor(() => expect(scoped.queryByLabelText("New entry name in Bills")).toBeNull());
  },
};

export const Empty: Story = {
  args: { entries: [] },
};

/** The housing add row open, with its example name; Cancel closes it and focus returns. */
export const AddRowOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = canvas.getAllByTestId("budget-editor")[0];
    if (!editor) throw new Error("Editor missing");
    const scoped = within(editor);
    const opener = scoped.getByRole("button", { name: "Add to housing" });
    await userEvent.click(opener);
    const name = scoped.getByLabelText("New entry name in Housing");
    await expect(name).toHaveFocus();
    await expect(name).toHaveAttribute("placeholder", "For example, Rent");
    await userEvent.click(scoped.getByTestId("budget-editor-cancel-add-housing"));
    await waitFor(() => expect(scoped.queryByLabelText("New entry name in Housing")).toBeNull());
    await expect(scoped.getByRole("button", { name: "Add to housing" })).toHaveFocus();
    // Leave the row open for the visual snapshot.
    await userEvent.click(scoped.getByRole("button", { name: "Add to housing" }));
    await expect(scoped.getByLabelText("New entry name in Housing")).toBeVisible();
  },
};

/**
 * Holds common entries in story state, so changes, removals and saves show. Saving moves each
 * ready draft into the saved entries, as the page does.
 */
const WithDrafts = (args: BudgetEditorProps) => {
  const [drafts, setDrafts] = useState<DraftBudgetEntry[]>(exampleBudgetDrafts());
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  return (
    <BudgetEditor
      {...args}
      drafts={drafts}
      entries={entries}
      onDraftChange={(id, update) =>
        setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...update } : d)))
      }
      onDraftRemove={(id) => setDrafts((prev) => prev.filter((d) => d.id !== id))}
      onRemoveDrafts={() => setDrafts([])}
      onSaveDrafts={async () => {
        const ready = drafts.filter(isDraftReady);
        setEntries((prev) => [
          ...prev,
          ...ready.map((d) => ({
            ...entryFromDraft(d),
            id: `saved-${d.id}`,
            userId: "u1",
            createdAt: "",
            updatedAt: "",
          })),
        ]);
        setDrafts((prev) => prev.filter((d) => !isDraftReady(d)));
      }}
    />
  );
};

/** "Add common entries": drafts with no amounts, under one labelled group. */
export const CommonEntries: Story = {
  args: { entries: [] },
  render: (args) => <WithDrafts {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = canvas.getAllByTestId("budget-editor")[0];
    if (!editor) throw new Error("Editor missing");
    const scoped = within(editor);
    await expect(scoped.getAllByText("Common entry")).toHaveLength(8);
    await expect(
      scoped.getByRole("group", { name: "Common entries not saved yet" }),
    ).toHaveTextContent("These common entries are not saved yet.");
    // Removing a draft asks nothing: it was never saved.
    await userEvent.click(scoped.getByRole("button", { name: "Remove Travel" }));
    await waitFor(() => expect(scoped.getAllByText("Common entry")).toHaveLength(7));
    await expect(canvas.queryByRole("dialog")).toBeNull();
    // Save entries waits for a draft with a name and an amount above £0.
    const save = scoped.getByRole("button", { name: "Save entries" });
    await expect(save).toBeDisabled();
    await userEvent.type(scoped.getByLabelText("Amount for Council tax"), "160");
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);
    // The saved draft leaves the list; the blank ones stay.
    await waitFor(() => expect(scoped.getAllByText("Common entry")).toHaveLength(6));
    await expect(scoped.getByTestId("budget-editor-name-saved-example-3")).toHaveValue(
      "Council tax",
    );
    // Remove common entries clears the rest, with no confirm.
    await userEvent.click(scoped.getByRole("button", { name: "Remove common entries" }));
    await waitFor(() => expect(scoped.queryByText("Common entry")).toBeNull());
    await expect(scoped.queryByRole("group", { name: "Common entries not saved yet" })).toBeNull();
  },
};
