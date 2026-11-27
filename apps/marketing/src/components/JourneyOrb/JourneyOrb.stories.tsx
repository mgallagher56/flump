import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { type FC, useRef } from "react";
import { expect, within } from "storybook/test";
import { AmbientMotionProvider } from "../../context/AmbientMotionContext";
import { StillMotionProvider } from "../../context/StillMotionContext";
import { JourneyOrb } from "./JourneyOrb";

const demo = css({ display: "grid", gridTemplateColumns: "160px 1fr", gap: "8" });
const demoStops = css({ display: "grid", gap: "64", py: "6" });

/** The rail beside three stand-in stops, each with the marker the track passes level with. */
const RailDemo: FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <AmbientMotionProvider>
      <div className={demo} ref={ref}>
        <JourneyOrb journeyRef={ref} tones={["sky", "violet", "teal"]} />
        <div className={demoStops}>
          {["Accounts", "Budget", "Pay"].map((name) => (
            <p key={name}>
              <span data-stop-marker="" /> {name}
            </p>
          ))}
        </div>
      </div>
    </AmbientMotionProvider>
  );
};

const meta: Meta<typeof RailDemo> = {
  title: "3. Patterns/Marketing/JourneyOrb",
  component: RailDemo,
  // The rest state, as with reduced motion: axe checks what a reader sees once a moment ends.
  decorators: [
    (Story) => (
      <StillMotionProvider>
        <Story />
      </StillMotionProvider>
    ),
  ],
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof RailDemo>;

const assertRail: Story["play"] = async ({ canvasElement }) => {
  const rail = within(canvasElement).getByTestId("journey-orb");
  await expect(rail).toHaveAttribute("aria-hidden", "true");
  await expect(within(rail).getByTestId("journey-still-orb")).toBeInTheDocument();
};

export const Light: Story = { globals: { theme: "light" }, play: assertRail };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertRail,
};
