import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import { flex } from "../../../styled-system/patterns";
import { Icon } from "../Icon/Icon";
import { Button, ButtonLink, IconButton } from "./Button";

const meta: Meta<typeof Button> = {
  title: "2. Primitives/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  args: {
    children: "Add missing details",
    onClick: fn(),
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "link", "danger", "dangerSubtle"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

const row = flex({ gap: "4", alignItems: "center", flexWrap: "wrap" });

export const Primary: Story = {
  args: {
    variant: "primary",
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Add missing details" });
    await expect(button).toBeInTheDocument();
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onClick).toHaveBeenCalled();
  },
};

export const Variants: Story = {
  render: () => (
    <div className={row}>
      <Button>Add missing details</Button>
      <Button variant="secondary">Not now</Button>
      <Button variant="outline">Add a goal</Button>
      <Button variant="ghost">Skip</Button>
      <Button variant="link">Learn how this works</Button>
      <Button variant="danger">Delete this goal</Button>
      <Button variant="dangerSubtle">Delete debt</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className={row}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div className={row}>
      <Button>
        <Icon icon={Plus} size="sm" />
        Add a goal
      </Button>
      <Button variant="secondary">
        Continue
        <Icon icon={ArrowRight} size="sm" />
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className={row}>
      <Button disabled>Add missing details</Button>
      <Button disabled variant="secondary">
        Not now
      </Button>
      <Button disabled variant="ghost">
        Skip
      </Button>
    </div>
  ),
};

export const Pending: Story = {
  render: () => (
    <div className={row}>
      <Button>Save changes</Button>
      <Button pending>Save changes</Button>
      <Button pending variant="secondary">
        Save changes
      </Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const buttons = canvas.getAllByRole("button", { name: "Save changes" });
    await expect(buttons[1]).toHaveAttribute("aria-busy", "true");
    await expect(buttons[1]).toHaveAttribute("aria-disabled", "true");
    await expect(buttons[0].getBoundingClientRect().width).toBeCloseTo(
      buttons[1].getBoundingClientRect().width,
      0,
    );
  },
};

/** E17 Demo 5: the label swaps to "Saved" with a tick, at the same width, and is announced. */
export const Saved: Story = {
  render: () => (
    <div className={row}>
      <Button saved={false}>Save balance</Button>
      <Button saved>Save balance</Button>
      <Button saved variant="secondary">
        Save balance
      </Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const buttons = canvas.getAllByRole("button", { name: "Save balance" });
    await expect(buttons[1]).toHaveAttribute("data-saved", "true");
    await expect(buttons[0].getBoundingClientRect().width).toBeCloseTo(
      buttons[1].getBoundingClientRect().width,
      0,
    );
    await waitFor(() =>
      expect(canvas.getAllByRole("status").some((s) => s.textContent === "Saved")).toBe(true),
    );
  },
};

export const SavedDark: Story = { ...Saved, globals: { theme: "dark" } };

export const Icons: Story = {
  render: () => (
    <div className={row}>
      <IconButton label="Edit account">
        <Icon icon={Pencil} size="sm" />
      </IconButton>
      <IconButton label="Add account" size="sm" variant="secondary">
        <Icon icon={Plus} size="sm" />
      </IconButton>
      <IconButton label="Delete account" size="lg" variant="danger">
        <Icon icon={Trash2} />
      </IconButton>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Edit account" })).toBeInTheDocument();
  },
};

/** Disabled in dark uses the subtle fill, so it reads as inactive, not as a black button (P29). */
export const DisabledDark: Story = {
  ...Disabled,
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const primary = canvas.getByRole("button", { name: "Add missing details" });
    await expect(primary).toBeDisabled();
  },
};

/**
 * An inline link button keeps its text size; on a touch screen an invisible ::before gives it a
 * 44px target (phone audit P16).
 */
const linkVariantPlay: Story["play"] = async ({ canvasElement, args }) => {
  const canvas = within(canvasElement);
  const link = canvas.getByRole("button", { name: "See how it has changed" });
  await expect(link.getBoundingClientRect().height).toBeLessThan(44);
  await userEvent.click(link);
  await expect(args.onClick).toHaveBeenCalled();
};

export const LinkVariant: Story = {
  args: { onClick: fn() },
  render: (args) => (
    <Button onClick={args.onClick} variant="link">
      See how it has changed
    </Button>
  ),
  play: linkVariantPlay,
};

export const LinkVariantDark: Story = { ...LinkVariant, globals: { theme: "dark" } };

export const Links: Story = {
  render: () => (
    <div className={row}>
      <ButtonLink href="#goals">Add a goal</ButtonLink>
      <ButtonLink href="#later" variant="secondary">
        Not now
      </ButtonLink>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "Add a goal" })).toHaveAttribute(
      "href",
      "#goals",
    );
  },
};

export const LongLabel: Story = {
  render: () => (
    <div className={flex({ maxWidth: "260px" })}>
      <Button>Add the missing mortgage details to your plan</Button>
    </div>
  ),
};
