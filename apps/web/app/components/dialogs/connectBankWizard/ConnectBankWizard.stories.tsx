import type { Meta, StoryObj } from "@storybook/react";
import { expect, screen, userEvent } from "storybook/test";
import ConnectBankWizard from "./ConnectBankWizard";

const meta: Meta<typeof ConnectBankWizard> = {
  title: "3. Patterns/Dialogs/ConnectBankWizard",
  component: ConnectBankWizard,
};

export default meta;
type Story = StoryObj<typeof ConnectBankWizard>;

export const Default: Story = {
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: /connect a bank/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Monzo Bank/ }));
    await expect(await screen.findByText("Choose how to connect")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Access token/ }));
    await expect(await screen.findByLabelText("Access token")).toBeInTheDocument();
  },
};
