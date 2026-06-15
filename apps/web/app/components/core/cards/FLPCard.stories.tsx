import type { Meta, StoryObj } from "@storybook/react";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import FLPCard from "./FLPCard";

const meta: Meta<typeof FLPCard> = {
  title: "Core/Cards/FLPCard",
  component: FLPCard,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FLPCard>;

export const Default: Story = {
  args: {
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <FLPHeading as="h4" size="lg">
          Card Title
        </FLPHeading>
        <FLPText>This is some content inside the beautiful FLPCard container.</FLPText>
      </div>
    ),
    style: { maxWidth: "350px" },
  },
};
