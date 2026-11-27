import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { StillMotionProvider } from "../../context/StillMotionContext";
import { FEATURE_GROUPS } from "../../utils/featureIndex";
import { FeatureIndex } from "./FeatureIndex";

const meta: Meta<typeof FeatureIndex> = {
  title: "3. Patterns/Marketing/FeatureIndex",
  component: FeatureIndex,
  args: { groupHrefs: { budget: "/features/budget", pay: "/features/pay" } },
  decorators: [
    // The rest state: a line opens and closes at once, as with reduced motion (the animated
    // opening is covered by FeatureIndex.test.tsx).
    (Story) => (
      <StillMotionProvider>
        <Story />
      </StillMotionProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FeatureIndex>;

interface Keyboard {
  /** True when keys go through the browser as real input. */
  real: boolean;
  tab: () => Promise<void>;
  press: (key: "{Enter}" | "[Space]") => Promise<void>;
}

/**
 * A keyboard that presses keys as a person does. `userEvent` from storybook/test only dispatches
 * synthetic key events, and a browser runs a summary's Enter and Space activation for real input
 * only, so a synthetic Enter never opens a `details`. Under the Storybook a11y job (Vitest browser
 * mode) keys go through Playwright as real input. Outside Vitest (the Storybook UI) there is no real
 * keyboard to drive, so the focused summary is clicked, which is what the browser does on Enter.
 */
const getKeyboard = async (): Promise<Keyboard> => {
  try {
    const { userEvent: real } = (await import("vitest/browser")) as unknown as {
      userEvent: { keyboard: (text: string) => Promise<void>; tab: () => Promise<void> };
    };
    return { real: true, tab: () => real.tab(), press: (key) => real.keyboard(key) };
  } catch {
    return {
      real: false,
      tab: () => userEvent.tab(),
      press: async () => {
        const focused = document.activeElement;
        if (focused instanceof HTMLElement) await userEvent.click(focused);
      },
    };
  }
};

/** Tabs to a line, opens it with Enter, closes it with Space and opens it again with Space. */
const openWithKeyboard: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("heading", { level: 3 })).toHaveLength(FEATURE_GROUPS.length);
  const details = canvasElement.querySelector<HTMLDetailsElement>("#breathing-room");
  const summary = details?.querySelector("summary");
  if (!details || !summary) throw new Error("breathing-room line missing");

  const keyboard = await getKeyboard();
  // The a11y job must press real keys; falling back there would hide a keyboard fault.
  await expect(keyboard.real).toBe("__vitest_browser__" in globalThis);

  for (let presses = 0; document.activeElement !== summary && presses < 50; presses++) {
    await keyboard.tab();
  }
  await expect(summary).toHaveFocus();

  await keyboard.press("{Enter}");
  await expect(details.open).toBe(true);
  await expect(
    within(details).getByRole("link", { name: "More on the Budget page" }),
  ).toBeVisible();

  await keyboard.press("[Space]");
  await expect(details.open).toBe(false);
  await keyboard.press("[Space]");
  await expect(details.open).toBe(true);
};

export const Light: Story = { globals: { theme: "light" }, play: openWithKeyboard };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: openWithKeyboard,
};
