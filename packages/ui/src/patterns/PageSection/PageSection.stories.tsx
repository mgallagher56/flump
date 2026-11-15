import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { LifeBuoy, WalletCards } from "lucide-react";
import { css } from "../../../styled-system/css";
import { Card } from "../../primitives/Card/Card";
import { Money } from "../../primitives/Money/Money";
import { ResultBlock } from "../ResultBlock/ResultBlock";
import { PageSection } from "./PageSection";

const meta: Meta<typeof PageSection> = {
  title: "3. Patterns/PageSection",
  component: PageSection,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof PageSection>;

const page = css({
  display: "flex",
  flexDirection: "column",
  gap: "page.section",
  maxWidth: "44rem",
});
const body = css({ margin: "0", textStyle: "body.md", color: "text.secondary" });
const narrow = css({ maxWidth: "24rem" });

/** Two saved sections 36px apart: a card of details, then a result in its own section. */
const TwoSections = () => (
  <div className={page}>
    <PageSection
      description="Your income and what you spend each month."
      domain="pay"
      icon={WalletCards}
      id="money-goes"
      title="Where your money goes"
    >
      <Card>
        <p className={body}>Housing, bills, living costs and extras.</p>
      </Card>
    </PageSection>
    <PageSection
      description="How long your savings would cover the essentials."
      icon={LifeBuoy}
      id="breathing-room"
      title="Breathing room"
      tone="accent"
    >
      <ResultBlock
        className={narrow}
        figure="1.5 months"
        label="Breathing room"
        leadIn="About"
        row={{ label: "Money to draw on", value: <Money size="sm" value={4200} /> }}
      />
    </PageSection>
  </div>
);

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("region", { name: "Where your money goes" })).toBeVisible();
  const room = canvas.getByRole("region", { name: "Breathing room" });
  // One result block per section, for that section's key figure.
  await expect(within(room).getAllByRole("group")).toHaveLength(1);
};

export const Default: Story = {
  globals: { theme: "light" },
  render: () => <TwoSections />,
  play,
};

export const Dark: Story = { ...Default, globals: { theme: "dark" } };

export const Phone: Story = {
  ...Default,
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
