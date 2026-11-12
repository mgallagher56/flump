import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { EmptyState } from "../../patterns/EmptyState/EmptyState";
import { Button } from "../Button/Button";
import { Illustration } from "./Illustration";
import { illustrationScenes } from "./Illustration.scenes";

const grid = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "6",
  p: "6",
  backgroundColor: "surface.canvas",
});

const meta: Meta<typeof Illustration> = {
  title: "2. Primitives/Illustration",
  component: Illustration,
  parameters: { layout: "padded" },
  args: { scene: "empty-accounts" },
};

export default meta;
type Story = StoryObj<typeof Illustration>;

const SceneGallery = () => (
  <div className={grid}>
    {illustrationScenes.map((scene) => (
      <EmptyState
        key={scene}
        description="Soft decorative artwork, hidden from assistive technology."
        headingLevel="h3"
        id={`scene-${scene}`}
        illustration={<Illustration scene={scene} />}
        title={scene}
        size="sm"
        action={<Button size="sm">Continue</Button>}
      />
    ))}
  </div>
);

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  // Artwork is decorative: nothing is exposed as an image.
  await expect(canvas.queryAllByRole("img")).toHaveLength(0);
  const hidden = canvasElement.querySelectorAll('svg[aria-hidden="true"]');
  await expect(hidden.length).toBe(illustrationScenes.length);
};

export const Light: Story = { globals: { theme: "light" }, render: () => <SceneGallery />, play };

export const Dark: Story = { globals: { theme: "dark" }, render: () => <SceneGallery />, play };

export const Large: Story = {
  args: { scene: "not-found", size: "lg" },
  globals: { theme: "light" },
};
