import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Heading } from "../Heading";
import { Card } from "./Card";

const row = css({ display: "flex", gap: "4", flexWrap: "wrap" });

const meta: Meta<typeof Card> = {
  title: "2. Primitives/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  args: {
    children: "SIPP & Workplace Pension Overview",
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Resting: Story = {
  args: {
    elevation: "resting",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("SIPP & Workplace Pension Overview").length).toBeGreaterThan(
      0,
    );
  },
};

export const Interactive: Story = {
  args: {
    elevation: "interactive",
  },
};

export const Floating: Story = {
  args: {
    elevation: "floating",
  },
};

const Surfaces = () => (
  <div className={row}>
    <Card as="section" surface="default">
      Default card
    </Card>
    <Card as="section" surface="subtle">
      Subtle card
    </Card>
    <Card as="section" surface="sunken">
      Sunken card
    </Card>
  </div>
);

const surfacesPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Sunken card").tagName).toBe("SECTION");
};

export const Light: Story = {
  globals: { theme: "light" },
  render: () => <Surfaces />,
  play: surfacesPlay,
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => <Surfaces />,
  play: surfacesPlay,
};

export const Padding: Story = {
  render: () => (
    <div className={row}>
      {(["sm", "md", "lg"] as const).map((padding) => (
        <Card key={padding} padding={padding}>
          Padding {padding}
        </Card>
      ))}
    </div>
  ),
};

const materialBody = css({ display: "flex", flexDirection: "column", gap: "2", maxWidth: "280px" });
const materialText = css({ textStyle: "body.sm", color: "text.secondary" });

const Materials = () => (
  <div className={row}>
    <Card as="article" className={materialBody} material="plain">
      <Heading as="h2" size="sm">
        Plain
      </Heading>
      <p className={materialText}>The everyday card.</p>
    </Card>
    <Card as="article" className={materialBody} material="glass">
      <Heading as="h2" size="sm">
        Glass
      </Heading>
      <p className={materialText}>A soft border, a faint inner light and a faint sheen.</p>
    </Card>
    <Card as="article" className={materialBody} material="paper">
      <Heading as="h2" size="sm">
        Paper
      </Heading>
      <p className={materialText}>Paper with faint ruled lines and a soft edge.</p>
    </Card>
  </div>
);

const materialsPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("article")).toHaveLength(3);
  await expect(canvas.getByRole("heading", { name: "Glass" })).toBeInTheDocument();
};

/** The three materials at rest. Glass is for cards holding no figure in the apps (AT3). */
export const MaterialsLight: Story = {
  globals: { theme: "light" },
  render: () => <Materials />,
  play: materialsPlay,
};

export const MaterialsDark: Story = {
  globals: { theme: "dark" },
  render: () => <Materials />,
  play: materialsPlay,
};

const GlassInteractive = () => (
  <Card
    as="article"
    className={materialBody}
    data-testid="glass-card"
    elevation="interactive"
    material="glass"
  >
    <Heading as="h2" size="sm">
      Connect your bank
    </Heading>
    <p className={materialText}>Hover for the still light. The border and the card stay put.</p>
  </Card>
);

/** Hovering brightens a soft light behind the content. No top border, no tilt, no movement. */
const glassHoverPlay: Story["play"] = async ({ canvasElement }) => {
  const card = within(canvasElement).getByTestId("glass-card");
  const borderTopBefore = getComputedStyle(card).borderTopColor;
  await userEvent.hover(card);
  // Synthetic pointer events do not set :hover, so mark the hovered state the recipe also reads.
  card.setAttribute("data-hover", "");
  await waitFor(() => expect(getComputedStyle(card, "::before").opacity).toBe("1"));
  await expect(getComputedStyle(card).borderTopColor).toBe(borderTopBefore);
  await expect(getComputedStyle(card).transform).toBe("none");
};

export const GlassHoverLight: Story = {
  globals: { theme: "light" },
  render: () => <GlassInteractive />,
  play: glassHoverPlay,
};

export const GlassHoverDark: Story = {
  globals: { theme: "dark" },
  render: () => <GlassInteractive />,
  play: glassHoverPlay,
};
