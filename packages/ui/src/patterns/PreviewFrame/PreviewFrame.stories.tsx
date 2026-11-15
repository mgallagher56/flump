import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { PreviewFrame, type SampleHouseholdKey } from "./PreviewFrame";

const meta: Meta<typeof PreviewFrame> = {
  title: "Patterns/PreviewFrame",
  component: PreviewFrame,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof PreviewFrame>;

export const Default: Story = {
  args: {
    id: "story-preview",
    title: "Monthly picture",
    children: <div style={{ padding: "1rem", textAlign: "center" }}>Sample preview content</div>,
  },
};

export const WithHouseholdSwitcher: Story = {
  render: () => {
    const [household, setHousehold] = useState<SampleHouseholdKey>("renter");
    return (
      <PreviewFrame
        household={household}
        id="story-preview-switcher"
        onHouseholdChange={setHousehold}
        title="Monthly picture"
      >
        <div style={{ padding: "1rem" }}>
          Active household: {household === "renter" ? "Renting" : "Paying a mortgage"}
        </div>
      </PreviewFrame>
    );
  },
};
