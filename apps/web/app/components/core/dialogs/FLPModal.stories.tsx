import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPModal from "./FLPModal";

const meta: Meta<typeof FLPModal> = {
  title: "Core/Dialogs/FLPModal",
  component: FLPModal,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FLPModal>;

const InteractiveModal = (args: any) => {
  const [open, setOpen] = useState(args.open || false);
  return (
    <FLPModal
      {...args}
      open={open}
      triggerBtn={
        <FLPButton variant="primary" onClick={() => setOpen(true)}>
          Open Modal
        </FLPButton>
      }
      onClose={() => {
        args.onClose?.();
        setOpen(false);
      }}
    />
  );
};

export const Default: Story = {
  render: (args) => <InteractiveModal {...args} />,
  args: {
    title: "Modal Title",
    children: "This is the content inside the modal dialog box.",
    confirmButton: { text: "Save Changes" },
    onConfirm: () => console.log("Confirmed"),
  },
};

export const OpenByDefault: Story = {
  args: {
    open: true,
    title: "Always Open Modal",
    children: "This story has the modal open by default so it is immediately visible.",
    confirmButton: { text: "Acknowledge" },
    triggerBtn: <FLPButton variant="primary">Trigger</FLPButton>,
    onClose: () => console.log("Close"),
    onConfirm: () => console.log("Confirm"),
  },
};
