import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import type { BudgetEntry } from "~/types/budget";
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

    // Adding a bill saves it and clears the add row.
    const name = scoped.getByLabelText("New entry name in Bills");
    await userEvent.type(name, "Water");
    await userEvent.click(scoped.getByRole("button", { name: "Add to Bills" }));
    await waitFor(() => expect(args.onAdd).toHaveBeenCalled());
    await waitFor(() => expect(name).toHaveValue(""));
  },
};

export const Empty: Story = {
  args: { entries: [] },
};
