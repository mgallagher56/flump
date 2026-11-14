import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { LONG_PREVIEW, PREVIEW_ACCOUNTS, PREVIEW_ROWS } from "../../fixtures";
import { ImportDiffTable, type ImportDiffTableProps } from "./ImportDiffTable";

const Stateful = (props: Omit<ImportDiffTableProps, "ticked" | "onToggle">) => {
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  return (
    <ImportDiffTable
      {...props}
      onToggle={(key, checked) =>
        setTicked((prev) => {
          const next = new Set(prev);
          if (checked) next.add(key);
          else next.delete(key);
          return next;
        })
      }
      ticked={ticked}
    />
  );
};

const meta: Meta<typeof Stateful> = {
  title: "3. Patterns/Imports/ImportDiffTable",
  component: Stateful,
  args: { accounts: PREVIEW_ACCOUNTS, rows: PREVIEW_ROWS },
};

export default meta;
type Story = StoryObj<typeof Stateful>;

export const WithFlaggedRow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("checkbox", { name: /Replace the value you entered/ }));
    await expect(canvas.getAllByText("Will be saved")[0]).toBeDefined();
  },
};

export const LongInDrawer: Story = {
  args: { rows: LONG_PREVIEW.rows },
};
