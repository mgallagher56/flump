import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "../Button";
import { Dialog } from "./Dialog";

/** Portalled content escapes the preview's themed wrapper, so theme the document root too. */
const DarkRoot = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    return () => {
      root.classList.remove("dark");
      root.removeAttribute("data-theme");
    };
  }, []);
  return children;
};

const Demo = (args: Partial<React.ComponentProps<typeof Dialog>>) => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add liability account"
        description="Only the name and balance are required."
        {...args}
      >
        <input aria-label="Account name" />
      </Dialog>
    </>
  );
};

const meta: Meta<typeof Dialog> = {
  title: "2. Primitives/Dialog",
  component: Dialog,
  parameters: { layout: "centered" },
  render: (args) => <Demo {...args} />,
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole("dialog", { name: "Add liability account" });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
  },
};

/** Separate from Default so the a11y check still runs against an open dialog. */
export const EscapeCloses: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole("dialog", { name: "Add liability account" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
  },
};

export const Large: Story = { args: { size: "lg" } };

export const WithFooter: Story = {
  args: {
    footer: (
      <>
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="button">Add account</Button>
      </>
    ),
  },
};

export const LongContent: Story = {
  args: {
    title: "Review your 2026 to 2027 tax summary",
    description: "Figures use the 2026 to 2027 UK tax year and are estimates, not advice.",
    children: (
      <ol>
        {Array.from({ length: 30 }, (_, i) => (
          <li key={`line-${i + 1}`}>Payment {i + 1}: £1,234.56 on 1 March 2027</li>
        ))}
      </ol>
    ),
  },
};

export const FocusTrapAndReturn: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    const opener = canvas.getByRole("button", { name: "Open dialog" });
    await userEvent.click(opener);
    const dialog = await body.findByRole("dialog");
    for (let i = 0; i < 6; i += 1) {
      await userEvent.tab();
      await expect(dialog.contains(canvasElement.ownerDocument.activeElement)).toBe(true);
    }
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(opener).toHaveFocus());
  },
};

export const Dark: Story = {
  ...Default,
  globals: { theme: "dark" },
  decorators: [
    (Story) => (
      <DarkRoot>
        <Story />
      </DarkRoot>
    ),
  ],
};
