import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { MemberList } from "./MemberList";

const meta: Meta<typeof MemberList> = {
  title: "3. Patterns/Invites/MemberList",
  component: MemberList,
  parameters: { layout: "padded" },
  args: {
    onRemove: fn(),
    members: [
      {
        userId: "user_sam",
        label: "Sam",
        addedAt: "2026-11-21T09:00:00.000Z",
        name: "Sam Patel",
        email: "sam.patel.with.a.rather.long.address.for.testing.wrapping@example.com",
      },
      {
        userId: "user_x",
        label: null,
        addedAt: "2026-11-22T09:00:00.000Z",
        name: null,
        email: null,
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof MemberList>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Remove access for Sam Patel" }),
    );
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.getByRole("alertdialog")).toBeInTheDocument();
  },
};

export const Empty: Story = { args: { members: [] } };

export const Dark: Story = { globals: { theme: "dark" } };

/** 360px wide: a long email address wraps inside the row, and nothing scrolls sideways. */
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div data-testid="narrow" style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const frame = within(canvasElement).getByTestId("narrow");
    const edge = frame.getBoundingClientRect().right;
    // Screen-reader-only text is a 1px box by design, so it is left out.
    const overflowing = [...frame.querySelectorAll("*")].filter(
      (el) =>
        el.clientWidth > 1 &&
        (el.getBoundingClientRect().right > edge + 0.5 || el.scrollWidth > el.clientWidth + 1),
    );
    await expect(overflowing).toEqual([]);
  },
};
