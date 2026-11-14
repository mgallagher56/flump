import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { AlertTriangle, BarChart3, PiggyBank } from "lucide-react";
import { css } from "../../../styled-system/css";
import { Button } from "../../primitives/Button/Button";
import { Icon } from "../../primitives/Icon/Icon";
import { Illustration as SceneIllustration } from "../../primitives/Illustration/Illustration";
import { EmptyState } from "./EmptyState";

const onAction = fn();
const onSecondary = fn();

const art = css({ color: "primary" });

const Illustration = () => (
  <svg aria-hidden="true" className={art} fill="none" height="96" viewBox="0 0 96 96" width="96">
    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="2" />
    <path d="M28 56l14-14 10 10 16-20" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const meta: Meta<typeof EmptyState> = {
  title: "3. Patterns/EmptyState",
  component: EmptyState,
  parameters: {
    layout: "padded",
  },
  args: {
    title: "No debts yet",
    description: "Add your credit cards, loans and overdrafts to compare payoff plans.",
    action: (
      <Button onClick={onAction} size="sm">
        Add debt
      </Button>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { name: "No debts yet" })).toBeInTheDocument();
  await userEvent.click(canvas.getByRole("button", { name: "Add debt" }));
  await expect(onAction).toHaveBeenCalled();
};

export const Light: Story = {
  globals: { theme: "light" },
  play,
};

export const Dark: Story = {
  globals: { theme: "dark" },
  play,
};

export const TitleOnly: Story = {
  args: { description: undefined, action: undefined },
  globals: { theme: "light" },
};

const firstRunArgs = {
  title: "Start with your first account",
  description: "Connect a current account or add a balance by hand to see your net worth.",
  illustration: <Illustration />,
  action: <Button size="sm">Connect an account</Button>,
  secondaryAction: (
    <Button onClick={onSecondary} size="sm" variant="secondary">
      Add a balance by hand
    </Button>
  ),
};

const firstRunPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole("button", { name: "Add a balance by hand" }));
  await expect(onSecondary).toHaveBeenCalled();
};

export const FirstRun: Story = {
  args: firstRunArgs,
  globals: { theme: "light" },
  play: firstRunPlay,
};

export const FirstRunDark: Story = {
  args: firstRunArgs,
  globals: { theme: "dark" },
  play: firstRunPlay,
};

export const NoData: Story = {
  args: {
    title: "No spending recorded this month",
    description: "Transactions appear here as soon as your accounts have synced.",
    icon: <Icon icon={BarChart3} size="lg" />,
    tone: "muted",
    size: "sm",
    action: undefined,
  },
  globals: { theme: "light" },
};

export const NoDataDark: Story = {
  args: { ...NoData.args },
  globals: { theme: "dark" },
};

export const SomethingWentWrong: Story = {
  args: {
    title: "We could not load your pension",
    description: "Your figures are safe. Try again in a moment, or check your connection.",
    icon: <Icon icon={AlertTriangle} size="lg" />,
    action: <Button size="sm">Try again</Button>,
  },
  globals: { theme: "light" },
};

export const WithIllustrationAndIcon: Story = {
  args: {
    title: "Nothing saved towards this goal",
    description: "Set a monthly amount and we will show when you could reach it.",
    icon: <Icon icon={PiggyBank} size="lg" />,
    illustration: <Illustration />,
  },
  globals: { theme: "dark" },
};

const goalsArgs = {
  title: "No goals yet",
  description: "Goals you add will appear here. This is sample data, so nothing has been saved.",
  illustration: <SceneIllustration scene="empty-goals" size="lg" />,
  action: <Button>Add a goal</Button>,
  secondaryAction: <Button variant="secondary">Not now</Button>,
};

export const DirectionCGoals: Story = {
  args: goalsArgs,
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Add a goal" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Not now" })).toBeInTheDocument();
  },
};

export const DirectionCGoalsDark: Story = {
  args: goalsArgs,
  globals: { theme: "dark" },
};

export const LongContent: Story = {
  args: {
    title: "No overpayments modelled for the 2026/27 tax year yet",
    description:
      "Once you add a mortgage or a loan, you can test regular and one-off overpayments here and see how each one changes your balance, monthly payment and total interest over the remaining term.",
    illustration: <SceneIllustration scene="empty-accounts" />,
  },
  globals: { theme: "light" },
};
