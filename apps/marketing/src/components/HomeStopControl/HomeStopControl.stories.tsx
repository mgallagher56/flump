import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { AmbientMotionProvider } from "../../context/AmbientMotionContext";
import { MotionControl } from "../MotionControl";
import { HomeStopControl } from "./HomeStopControl";

const NAMES = ["One picture", "Five areas", "Rough figures"] as const;

const stopStyle = css({
  minHeight: "100vh",
  padding: "8",
  borderBottomWidth: "1px",
  borderBottomStyle: "solid",
  borderBottomColor: "border",
  backgroundColor: "surface.canvas",
  "&:nth-of-type(even)": { backgroundColor: "surface.card" },
});

const headingStyle = css({ textStyle: "heading.lg", color: "text.primary", margin: 0 });

/** Three marked sections, as the home page marks its fourteen. */
const Demo = () => (
  <AmbientMotionProvider>
    {NAMES.map((name, i) => (
      <section
        aria-labelledby={`story-stop-${i}`}
        className={stopStyle}
        data-home-section=""
        data-home-section-name={name}
        key={name}
      >
        <h2 className={headingStyle} id={`story-stop-${i}`}>
          {name}
        </h2>
      </section>
    ))}
    <HomeStopControl aside={<MotionControl />} />
  </AmbientMotionProvider>
);

const meta: Meta<typeof HomeStopControl> = {
  title: "3. Patterns/Marketing/HomeStopControl",
  component: HomeStopControl,
  parameters: { layout: "fullscreen" },
  render: () => <Demo />,
};

export default meta;
type Story = StoryObj<typeof HomeStopControl>;

/** Next and previous move focus to each heading; the ends are disabled. */
const assertStepping: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const nav = await canvas.findByRole("navigation", { name: "Sections" });
  const inNav = within(nav);
  await expect(inNav.getByRole("button", { name: "Previous section" })).toBeDisabled();
  await expect(inNav.getByText("One picture")).toBeVisible();

  await userEvent.click(inNav.getByRole("button", { name: "Next section: Five areas" }));
  await waitFor(() => expect(canvas.getByRole("heading", { name: "Five areas" })).toHaveFocus());

  await userEvent.click(inNav.getByRole("button", { name: "Next section: Rough figures" }));
  await waitFor(() => expect(canvas.getByRole("heading", { name: "Rough figures" })).toHaveFocus());
  await waitFor(() => expect(inNav.getByRole("button", { name: "Next section" })).toBeDisabled());

  await userEvent.click(inNav.getByRole("button", { name: "Previous section: Five areas" }));
  await waitFor(() => expect(canvas.getByRole("heading", { name: "Five areas" })).toHaveFocus());
};

export const Light: Story = { globals: { theme: "light" }, play: assertStepping };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertStepping,
};
