import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "storybook/test";
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
  <>
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
    <HomeStopControl />
  </>
);

const meta: Meta<typeof HomeStopControl> = {
  title: "3. Patterns/Marketing/HomeStopControl",
  component: HomeStopControl,
  parameters: { layout: "fullscreen" },
  render: () => <Demo />,
};

export default meta;
type Story = StoryObj<typeof HomeStopControl>;

/** Waits until the page has stopped scrolling (the same position twice, 150ms apart). */
const scrollStill = async (view: Window) => {
  let lastY = Number.NaN;
  await waitFor(
    () => {
      const y = view.scrollY;
      const still = y === lastY;
      lastY = y;
      expect(still).toBe(true);
    },
    { timeout: 5000, interval: 150 },
  );
};

/**
 * Clicks a control button once the last move has settled and the control is back. While the page
 * scrolls the control steps out of the way and takes no pointer; a mouse resting on it keeps it
 * (`:hover`), but the test's clicks are synthetic and have no hover, so wait for the scroll to
 * stop and the control to return (700ms after the last scroll).
 */
const clickWhenBack = async (button: HTMLElement) => {
  const view = button.ownerDocument.defaultView ?? window;
  await scrollStill(view);
  await waitFor(() => expect(view.getComputedStyle(button).pointerEvents).not.toBe("none"), {
    timeout: 5000,
  });
  await userEvent.click(button);
};

/** Next and previous move focus to each heading; the ends are disabled. */
const assertStepping: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const nav = await canvas.findByRole("navigation", { name: "Sections" });
  const inNav = within(nav);
  // Start at the top, as a reader scrolling back up would (the wheel lets go of any move the
  // control is still holding in place): a story run before this one in the same page may have left
  // it scrolled, with its last move held.
  const view = canvasElement.ownerDocument.defaultView ?? window;
  await scrollStill(view);
  view.dispatchEvent(new WheelEvent("wheel", { deltaY: -1 }));
  view.scrollTo({ top: 0, behavior: "auto" });
  await waitFor(() => expect(nav).toHaveTextContent("1 of 3"));
  await expect(inNav.getByRole("button", { name: "Previous section" })).toBeDisabled();
  await expect(inNav.getByText("One picture")).toBeVisible();

  await clickWhenBack(inNav.getByRole("button", { name: "Next section: Five areas" }));
  await waitFor(() => expect(canvas.getByRole("heading", { name: "Five areas" })).toHaveFocus());

  await clickWhenBack(inNav.getByRole("button", { name: "Next section: Rough figures" }));
  await waitFor(() => expect(canvas.getByRole("heading", { name: "Rough figures" })).toHaveFocus());
  await waitFor(() => expect(inNav.getByRole("button", { name: "Next section" })).toBeDisabled());

  await clickWhenBack(inNav.getByRole("button", { name: "Previous section: Five areas" }));
  await waitFor(() => expect(canvas.getByRole("heading", { name: "Five areas" })).toHaveFocus());
  // End settled, so no scroll still on its way reaches the next story.
  await scrollStill(view);
};

export const Light: Story = { globals: { theme: "light" }, play: assertStepping };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertStepping,
};
