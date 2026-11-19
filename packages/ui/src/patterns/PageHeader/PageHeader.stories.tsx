import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Button } from "../../primitives/Button/Button";
import { PageHeader } from "./PageHeader";
import { SHORT_VIEWPORT } from "./PageHeader.styles";

const meta: Meta<typeof PageHeader> = {
  title: "3. Patterns/PageHeader",
  component: PageHeader,
  parameters: {
    layout: "padded",
  },
  args: {
    title: "Debt payoff",
    description: "See how extra payments change your payoff date and the interest you pay.",
    actions: <Button size="sm">Add debt</Button>,
  },
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Debt payoff" }),
    ).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Add debt" })).toBeInTheDocument();
  },
};

const primaryAndSecondaryArgs = {
  title: "Your budget",
  description: "What comes in, what goes out and what is left each month.",
  actions: (
    <>
      <Button size="sm" variant="secondary">
        Export
      </Button>
      <Button size="sm">Edit budget</Button>
    </>
  ),
};

const primaryAndSecondaryPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("button")).toHaveLength(2);
  await expect(canvas.getByRole("button", { name: "Edit budget" })).toBeInTheDocument();
  await expect(canvas.queryByRole("note")).toBeNull();
};

/**
 * The one `actions` slot holds one primary and at most one secondary. The description is one
 * line. There is no notice slot: the page's notice sits at the foot of its first projection.
 */
export const PrimaryAndSecondary: Story = {
  args: primaryAndSecondaryArgs,
  play: primaryAndSecondaryPlay,
};

export const PrimaryAndSecondaryDark: Story = {
  args: primaryAndSecondaryArgs,
  globals: { theme: "dark" },
  play: primaryAndSecondaryPlay,
};

const withIllustrationArgs = {
  title: "Your savings",
  description: "Your balances, what you save each month and where it could get to.",
  illustration: "empty-savings" as const,
  actions: <Button size="sm">Add account</Button>,
};

const withIllustrationPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const art = canvas.getByTestId("page-header-illustration");
  // Decorative: hidden from assistive technology, and still (no settle animation).
  await expect(art.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  await expect(art.querySelector("[data-scene-settle]")).toBeNull();
};

/** The page icon: the page's own illustration beside the h1, empty or filled in. */
export const WithIllustration: Story = {
  args: withIllustrationArgs,
  play: withIllustrationPlay,
};

export const WithIllustrationDark: Story = {
  args: withIllustrationArgs,
  globals: { theme: "dark" },
  play: withIllustrationPlay,
};

/** At 375 the icon starts the description row, so the h1 keeps its width and nothing moves down. */
export const WithIllustrationPhone: Story = {
  args: withIllustrationArgs,
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: withIllustrationPlay,
};

export const SampleDataBadge: Story = {
  args: {
    title: "Home",
    description: "Where you stand this month. Sample data.",
    badge: "Sample data",
    actions: undefined,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Sample data")).toBeInTheDocument();
  },
};

export const TitleOnly: Story = {
  args: { description: undefined, actions: undefined },
};

export const LongContent: Story = {
  args: {
    title: "Mortgage overpayment and remortgage planning for 2026/27",
    description:
      "Compare overpaying with saving, test a higher renewal rate and see what each choice does to your balance, monthly payment and total interest over the term.",
    badge: "Sample data",
  },
};

/**
 * Phone sweep 4: on a phone the header reads h1, description, then the actions, so actions never
 * sit between the h1 and its description. From md the actions sit beside the text.
 */
const phonePlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const title = canvas.getByRole("heading", { level: 1, name: "Your budget" });
  const description = canvas.getByText("Your income, spending and how long your money lasts.");
  const action = canvas.getByRole("button", { name: "Edit budget" });
  const titleBox = title.getBoundingClientRect();
  const descriptionBox = description.getBoundingClientRect();
  const actionBox = action.getBoundingClientRect();
  if (window.innerWidth < 768) {
    await expect(descriptionBox.top >= titleBox.bottom - 1).toBe(true);
    await expect(actionBox.top >= descriptionBox.bottom - 1).toBe(true);
  } else {
    // From md the action shares the h1's row.
    const centre = actionBox.top + actionBox.height / 2;
    await expect(centre < descriptionBox.bottom).toBe(true);
  }
};

/** 375px wide: the h1, then the description, then the action on its own row. */
const phone375 = {
  viewports: {
    phone375: { name: "Phone 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
  },
  defaultViewport: "phone375",
};

export const PhoneTitleAndAction: Story = {
  args: {
    title: "Your budget",
    description: "Your income, spending and how long your money lasts.",
    actions: <Button variant="outline">Edit budget</Button>,
  },
  parameters: { viewport: phone375 },
  play: phonePlay,
};

export const PhoneTitleAndActionDark: Story = {
  ...PhoneTitleAndAction,
  globals: { theme: "dark" },
};

/**
 * A long title on a phone keeps the full width and the action drops under it, so the two never
 * overlap and the h1 is not squeezed into a narrow column (phone audit P01, P03).
 */
const phoneLongTitlePlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const header = canvasElement.querySelector("header") as HTMLElement;
  // Nothing runs off the side: the header is no wider than its container.
  await expect(header.scrollWidth <= header.clientWidth + 1).toBe(true);
  const title = canvas.getByRole("heading", { level: 1 }).getBoundingClientRect();
  const action = canvas.getByRole("button", { name: "Edit details" }).getBoundingClientRect();
  await expect(action.top >= title.bottom - 1).toBe(true);
};

export const PhoneLongTitle: Story = {
  args: {
    title: "Pension contributions and income above £100,000",
    description: "How pension contributions change tax on income over £100,000.",
    actions: <Button variant="outline">Edit details</Button>,
  },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: phoneLongTitlePlay,
};

export const PhoneLongTitleDark: Story = {
  ...PhoneLongTitle,
  globals: { theme: "dark" },
};

/** With no description the icon sits before the h1, not alone on a row of its own (P50). */
const phoneNoDescriptionPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const title = canvas.getByRole("heading", { level: 1 }).getBoundingClientRect();
  const art = canvas.getByTestId("page-header-illustration").getBoundingClientRect();
  await expect(art.top < title.bottom && art.bottom > title.top).toBe(true);
};

export const PhoneIllustrationNoDescription: Story = {
  args: {
    title: "Debt",
    description: undefined,
    illustration: "empty-savings",
    actions: <Button size="sm">Add debt</Button>,
  },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: phoneNoDescriptionPlay,
};

export const PhoneIllustrationNoDescriptionDark: Story = {
  ...PhoneIllustrationNoDescription,
  globals: { theme: "dark" },
};

/**
 * A phone in landscape (812x375): under 480px tall the header goes compact, with no icon, the
 * description visually hidden (still read by screen readers) and a smaller h1, so the h1 and the
 * headline figure share the first view (P78).
 * The play checks the rule against the viewport it runs in, so it holds at any size.
 */
const landscapePlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  // The same query the recipe uses (short, landscape and a coarse pointer), so the play checks the
  // compact header on a touch phone and the full header on a short desktop window or in
  // Storybook's Chromium, which has a fine pointer. The recipe test covers the rule itself.
  const short = window.matchMedia(SHORT_VIEWPORT.replace(/^@media\s+/, "")).matches;
  const description = canvas.getByText("Everything you own and owe, in one place.");
  const art = canvas.getByTestId("page-header-illustration");
  // The description is visually hidden, never display none, so screen readers still hear it.
  await expect(getComputedStyle(description).display).not.toBe("none");
  await expect(getComputedStyle(description).position === "absolute").toBe(short);
  await expect(getComputedStyle(art).display === "none").toBe(short);
  await expect(canvas.getByRole("heading", { level: 1, name: "Your accounts" })).toBeVisible();
};

export const PhoneLandscape: Story = {
  args: {
    title: "Your accounts",
    description: "Everything you own and owe, in one place.",
    illustration: "empty-accounts",
    actions: <Button size="sm">Add account</Button>,
  },
  parameters: {
    viewport: {
      viewports: {
        phoneLandscape: {
          name: "Phone landscape",
          styles: { width: "812px", height: "375px" },
          type: "mobile",
        },
      },
      defaultViewport: "phoneLandscape",
    },
  },
  play: landscapePlay,
};

export const PhoneLandscapeDark: Story = {
  ...PhoneLandscape,
  globals: { theme: "dark" },
};
