import type { Meta, StoryObj } from "@storybook/react";
import FLPHeading from "./FLPHeading";

const meta: Meta<typeof FLPHeading> = {
  title: "Core/Typography/FLPHeading",
  component: FLPHeading,
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: ["h1", "h2", "h3", "h4", "h5", "h6"],
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof FLPHeading>;

export const Default: Story = {
  args: {
    children: "This is a Heading",
    as: "h2",
    size: "xl",
  },
};

export const Sizing: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <FLPHeading as="h1" size="4xl">
        4xl Heading
      </FLPHeading>
      <FLPHeading as="h2" size="3xl">
        3xl Heading
      </FLPHeading>
      <FLPHeading as="h3" size="2xl">
        2xl Heading
      </FLPHeading>
      <FLPHeading as="h4" size="xl">
        xl Heading
      </FLPHeading>
      <FLPHeading as="h5" size="lg">
        lg Heading
      </FLPHeading>
      <FLPHeading as="h6" size="md">
        md Heading
      </FLPHeading>
      <FLPHeading as="h6" size="sm">
        sm Heading
      </FLPHeading>
      <FLPHeading as="h6" size="xs">
        xs Heading
      </FLPHeading>
    </div>
  ),
};
