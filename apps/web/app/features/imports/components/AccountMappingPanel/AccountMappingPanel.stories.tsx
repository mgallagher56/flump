import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { EXISTING_ACCOUNTS, PREVIEW_ACCOUNTS } from "../../fixtures";
import { type AccountMap, initialAccountMap } from "../../importModel";
import { AccountMappingPanel } from "./AccountMappingPanel";

const Stateful = () => {
  const [map, setMap] = useState<AccountMap>(initialAccountMap(PREVIEW_ACCOUNTS));
  return (
    <AccountMappingPanel
      accounts={PREVIEW_ACCOUNTS}
      existing={EXISTING_ACCOUNTS}
      map={map}
      onChange={(ref, id) => setMap((m) => ({ ...m, [ref]: id }))}
    />
  );
};

const meta: Meta<typeof Stateful> = {
  title: "3. Patterns/Imports/AccountMappingPanel",
  component: Stateful,
};

export default meta;
type Story = StoryObj<typeof Stateful>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const isa = canvas.getByLabelText("Stocks ISA") as HTMLSelectElement;
    await userEvent.selectOptions(isa, EXISTING_ACCOUNTS[0]?.id as string);
    await expect(isa.value).toBe(EXISTING_ACCOUNTS[0]?.id);
  },
};
