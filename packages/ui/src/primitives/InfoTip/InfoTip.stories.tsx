import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { InfoTip } from "./InfoTip";

const Row = ({ children }: { children: string }) => (
  <p className={css({ display: "inline-flex", alignItems: "center", gap: "1", margin: 0 })}>
    {children}
    <InfoTip term="Personal Allowance" defaultOpen id="info-tip-story">
      The amount of income you can earn each tax year before paying Income Tax. In 2025/26 it is
      £12,570, and it reduces by £1 for every £2 of income above £100,000.
    </InfoTip>
  </p>
);

const meta: Meta<typeof InfoTip> = {
  title: "2. Primitives/InfoTip",
  component: InfoTip,
  parameters: { layout: "centered" },
  args: {
    term: "Personal Allowance",
    children: "The amount of income you can earn each tax year before paying Income Tax.",
  },
  decorators: [
    (Story) => (
      <div className={css({ paddingY: "32", paddingX: "40" })}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof InfoTip>;

export const Closed: Story = {};

/** Open so the a11y check covers the glossary popover. */
export const Open: Story = {
  args: { defaultOpen: true },
};

export const InlineWithLabel: Story = {
  render: () => <Row>Tax free allowance</Row>,
};

/** Pointer: a click opens it (touch friendly, not hover only), Escape closes. */
export const OpensOnClick: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const trigger = within(canvasElement).getByRole("button", { name: "About Personal Allowance" });
    await userEvent.click(trigger);
    const dialog = await body.findByRole("dialog", { name: "Personal Allowance" });
    await expect(dialog).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};

/** Keyboard: Tab to the button, Enter opens, Escape closes and focus returns. */
export const OpensOnEnter: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.tab();
    const trigger = within(canvasElement).getByRole("button", { name: "About Personal Allowance" });
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(
      await body.findByRole("dialog", { name: "Personal Allowance" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};

export const Dark: Story = { ...Open, globals: { theme: "dark" } };
