import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import { css } from "../../../styled-system/css";
import { Button } from "../Button/Button";
import { SavedFigure } from "./SavedFigure";

const meta: Meta<typeof SavedFigure> = {
  title: "2. Primitives/SavedFigure",
  component: SavedFigure,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SavedFigure>;

const InteractiveDemo = () => {
  const [val, setVal] = useState("£1,840.00");
  return (
    <div className={css({ display: "grid", gap: "4", maxWidth: "320px" })}>
      <Button
        id="save-figure-toggle"
        onClick={() => setVal((v) => (v === "£1,840.00" ? "£2,315.40" : "£1,840.00"))}
        size="sm"
        variant="secondary"
      >
        Simulate save
      </Button>
      <SavedFigure id="demo-acct" label="Current account" value={val} />
    </div>
  );
};

export const Default: Story = {
  render: () => <InteractiveDemo />,
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole("button", { name: /Simulate save/ });
    expect(canvas.getByText("£1,840.00")).toBeInTheDocument();
    await userEvent.click(btn);
    await waitFor(() => expect(canvas.getByText("£2,315.40")).toBeInTheDocument());
  },
};

export const Dark: Story = {
  render: () => <InteractiveDemo />,
  globals: { theme: "dark" },
};
