import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { HomeLogo } from "../HomeLogo/HomeLogo";
import { NavDrawer } from "./NavDrawer";
import { navDrawerBody, navDrawerLink } from "./NavDrawer.styles";

const Demo = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open navigation menu
      </button>
      <NavDrawer
        footer={<span>Footer slot</span>}
        isOpen={open}
        logo={<HomeLogo decorative />}
        onClose={() => setOpen(false)}
      >
        <nav aria-label="Mobile navigation" className={navDrawerBody()}>
          <a className={navDrawerLink()} href="#calculators">
            Calculators
          </a>
          <a className={navDrawerLink()} href="#pricing">
            Pricing
          </a>
        </nav>
      </NavDrawer>
    </>
  );
};

const meta: Meta<typeof Demo> = {
  title: "3. Financial Patterns & Sections/NavDrawer",
  component: Demo,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Demo>;

const play: Story["play"] = async ({ canvasElement }) => {
  const body = within(canvasElement.ownerDocument.body);
  await expect(body.getByRole("dialog")).toBeInTheDocument();
  await userEvent.click(body.getByRole("button", { name: "Close navigation menu" }));
  await expect(body.queryByRole("dialog")).toBeNull();
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
