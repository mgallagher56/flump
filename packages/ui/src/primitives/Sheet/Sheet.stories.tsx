import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { type FC, type ReactNode, useState } from "react";
import { css } from "../../../styled-system/css";
import { Button } from "../Button";
import { Sheet, type SheetProps } from "./Sheet";

const grid = css({ display: "grid", gap: "4" });
const field = css({
  display: "block",
  fontVariantNumeric: "tabular-nums",
  color: "text.primary",
  backgroundColor: "surface.sunken",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.input",
  borderRadius: "control",
  padding: "2",
});

const Controls: FC = () => (
  <div className={grid}>
    <label>
      Monthly overpayment
      <input className={field} defaultValue="£250" />
    </label>
    <label>
      Interest rate
      <input className={field} defaultValue="4.25%" />
    </label>
  </div>
);

const Demo = (args: Partial<SheetProps>) => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Open sheet
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Adjust your plan"
        description="Changes apply to the chart straight away."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => setOpen(false)}>
              Apply changes
            </Button>
          </>
        }
        {...args}
      >
        <Controls />
      </Sheet>
    </>
  );
};

const meta: Meta<typeof Sheet> = {
  title: "2. Primitives/Sheet",
  component: Sheet,
  parameters: { layout: "centered" },
  render: (args) => <Demo {...args} />,
};

export default meta;
type Story = StoryObj<typeof Sheet>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const sheet = await body.findByRole("dialog", { name: "Adjust your plan" });
    await expect(sheet).toHaveAttribute("aria-modal", "true");
    await expect(sheet).toHaveAccessibleDescription("Changes apply to the chart straight away.");
  },
};

export const SideRight: Story = { args: { side: "right" } };

export const LongContent: Story = {
  args: {
    children: (
      <ol>
        {Array.from({ length: 40 }, (_, i) => (
          <li key={`row-${i + 1}`}>Payment {i + 1} of 40: £1,234.56 on 1 March 2027</li>
        ))}
      </ol>
    ),
  },
};

/** Separate from Default so the a11y check still runs against an open sheet. */
export const EscapeCloses: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole("dialog", { name: "Adjust your plan" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
  },
};

export const FocusTrapAndReturn: Story = {
  render: (args) => <Demo {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    const opener = canvas.getByRole("button", { name: "Open sheet" });
    await userEvent.click(opener);
    const sheet = await body.findByRole("dialog");
    await expect(sheet.contains(canvasElement.ownerDocument.activeElement)).toBe(true);
    // Tab through every control: focus must never leave the sheet.
    for (let i = 0; i < 8; i += 1) {
      await userEvent.tab();
      await expect(sheet.contains(canvasElement.ownerDocument.activeElement)).toBe(true);
    }
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(opener).toHaveFocus());
  },
};

/**
 * Local mock of the shape SimulatorSplitLayout's `renderControlsContainer` will receive (PR #582):
 * `({ open, onOpenChange, id, label, children })`. Not imported, so this story does not depend on it.
 */
interface ControlsContainerArgs {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
  label: string;
  children: ReactNode;
}

const renderControlsContainer = ({
  open,
  onOpenChange,
  id,
  label,
  children,
}: ControlsContainerArgs) => (
  <Sheet open={open} onOpenChange={onOpenChange} id={id} title={label}>
    {children}
  </Sheet>
);

const SplitLayoutMock = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Edit assumptions
      </Button>
      {renderControlsContainer({
        open,
        onOpenChange: setOpen,
        id: "simulator-controls",
        label: "Edit assumptions",
        children: <Controls />,
      })}
    </>
  );
};

export const AsSimulatorControlsContainer: Story = {
  render: () => <SplitLayoutMock />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const sheet = await body.findByRole("dialog", { name: "Edit assumptions" });
    await expect(sheet).toHaveAttribute("id", "simulator-controls");
  },
};
