import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { BubbleField } from "./BubbleField";

const band = css({
  position: "relative",
  minHeight: "320px",
  backgroundColor: "surface.canvas",
  py: { base: "12", md: "16" },
  px: "4",
});

const meta: Meta<typeof BubbleField> = {
  title: "3. Patterns/Marketing/BubbleField",
  component: BubbleField,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className={band}>
        <Story />
        <p>Band content sits above the field.</p>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BubbleField>;

export const Light: Story = { args: { layout: "a" }, globals: { theme: "light" } };

export const Dark: Story = {
  args: { layout: "b" },
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
};
