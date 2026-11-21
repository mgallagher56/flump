import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { css } from "../../../styled-system/css";
import { DEFAULT_PREVIEW_CAPTION, PreviewFrame, type SampleHouseholdKey } from "./PreviewFrame";

const meta: Meta<typeof PreviewFrame> = {
  title: "3. Patterns/PreviewFrame",
  component: PreviewFrame,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof PreviewFrame>;

const content = css({ p: "4", textAlign: "center", color: "text.primary" });

const defaultArgs = {
  id: "story-preview",
  title: "Monthly picture",
  children: <div className={content}>Sample preview content</div>,
};

const framePlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { name: "Monthly picture" })).toBeVisible();
  await expect(canvas.getByText("Example")).toBeVisible();
  await expect(canvas.getByText(DEFAULT_PREVIEW_CAPTION)).toBeVisible();
};

export const Default: Story = { args: defaultArgs, globals: { theme: "light" }, play: framePlay };

export const Dark: Story = { args: defaultArgs, globals: { theme: "dark" }, play: framePlay };

/** Inside a section that has its own heading: the title is a label, not a second heading. */
export const TitleAsLabel: Story = {
  args: { ...defaultArgs, id: "story-preview-label", titleAs: "p" },
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("heading")).toBeNull();
    await expect(canvas.getByRole("figure", { name: "Monthly picture Example" })).toBeVisible();
  },
};

const SwitcherDemo = () => {
  const [household, setHousehold] = useState<SampleHouseholdKey>("renter");
  return (
    <PreviewFrame
      household={household}
      id="story-preview-switcher"
      onHouseholdChange={setHousehold}
      title="Monthly picture"
    >
      <div className={content}>
        Active household: {household === "renter" ? "Renting" : "Paying a mortgage"}
      </div>
    </PreviewFrame>
  );
};

const switcherPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const owner = canvas.getByRole("button", { name: "Paying a mortgage" });
  await userEvent.click(owner);
  await expect(owner).toHaveAttribute("aria-pressed", "true");
  await expect(canvas.getByText("Active household: Paying a mortgage")).toBeVisible();
};

export const WithHouseholdSwitcher: Story = {
  render: () => <SwitcherDemo />,
  globals: { theme: "light" },
  play: switcherPlay,
};

export const WithHouseholdSwitcherDark: Story = {
  render: () => <SwitcherDemo />,
  globals: { theme: "dark" },
  play: switcherPlay,
};
