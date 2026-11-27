import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { type FC, useRef } from "react";
import { expect } from "storybook/test";
import { AmbientMotionProvider } from "../../context/AmbientMotionContext";
import { GlassOrb } from "../GlassOrb";
import { SceneStage, type SceneStartContext } from "./SceneStage";

/** A stand-in scene: the stories show the still layer, which is what a weak device keeps. */
const neverStarts = (_context: SceneStartContext) => new Promise<never>(() => {});

const Demo: FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className={css({ position: "relative", height: "100svh" })} ref={ref}>
      <SceneStage start={neverStarts} watchRef={ref}>
        <GlassOrb
          className={css({ position: "absolute", left: "8", top: "12" })}
          size="xl"
          tone="sky"
        />
        <GlassOrb
          className={css({ position: "absolute", right: "8", bottom: "12" })}
          size="lg"
          tone="rose"
        />
      </SceneStage>
      <p className={css({ position: "relative", padding: "8", color: "text.primary" })}>
        Content scrolls over the stage.
      </p>
    </div>
  );
};

const meta: Meta<typeof Demo> = {
  title: "3. Patterns/Marketing/SceneStage",
  component: Demo,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <AmbientMotionProvider>
        <Story />
      </AmbientMotionProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Demo>;

const assertStill: Story["play"] = async ({ canvasElement }) => {
  const stage = canvasElement.querySelector("[data-testid=scene-stage]");
  await expect(stage?.getAttribute("aria-hidden")).toBe("true");
  await expect(stage?.getAttribute("data-scene")).toBe("still");
  await expect(stage?.querySelectorAll("[data-glass-orb]")).toHaveLength(2);
};

export const Light: Story = { globals: { theme: "light" }, play: assertStill };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertStill,
};
