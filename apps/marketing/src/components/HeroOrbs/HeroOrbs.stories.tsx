import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { type FC, useRef } from "react";
import { expect, within } from "storybook/test";
import { StillMotionProvider } from "../../context/StillMotionContext";
import { HeroOrbs, type HeroOrbTones } from "./HeroOrbs";

const Demo: FC<{ tones: HeroOrbTones }> = ({ tones }) => {
  const ref = useRef<HTMLElement>(null);
  return (
    <section
      aria-label="Hero orbs"
      className={css({
        position: "relative",
        isolation: "isolate",
        minHeight: "30rem",
        backgroundColor: "surface.canvas",
      })}
      ref={ref}
    >
      <HeroOrbs tones={tones} watchRef={ref} />
    </section>
  );
};

const meta: Meta<typeof Demo> = {
  title: "3. Patterns/Marketing/HeroOrbs",
  component: Demo,
  parameters: { layout: "fullscreen" },
  decorators: [
    // The still orbs, as a weak device or reduced motion shows them: no story starts three.js.
    (Story) => (
      <StillMotionProvider>
        <Story />
      </StillMotionProvider>
    ),
  ],
  args: { tones: ["sky", "violet", "teal", "rose"] },
};

export default meta;
type Story = StoryObj<typeof Demo>;

const assertOrbs: Story["play"] = async ({ canvasElement }) => {
  const stage = within(canvasElement).getByTestId("hero-stage");
  await expect(stage.querySelectorAll("[data-glass-orb]")).toHaveLength(4);
};

export const Light: Story = { globals: { theme: "light" }, play: assertOrbs };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertOrbs,
};
