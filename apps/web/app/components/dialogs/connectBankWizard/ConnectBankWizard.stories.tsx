import type { Meta, StoryObj } from "@storybook/react";
import { expect, screen, userEvent } from "storybook/test";
import ConnectBankWizard from "./ConnectBankWizard";

const meta: Meta<typeof ConnectBankWizard> = {
  title: "Dialogs/ConnectBankWizard",
  component: ConnectBankWizard,
};

export default meta;
type Story = StoryObj<typeof ConnectBankWizard>;

export const Default: Story = {
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: /connect bank account/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Monzo Bank/ }));
    await expect(await screen.findByText("Choose how to connect")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Personal access token/ }));
    await expect(await screen.findByLabelText("Developer access token")).toBeInTheDocument();
  },
};
