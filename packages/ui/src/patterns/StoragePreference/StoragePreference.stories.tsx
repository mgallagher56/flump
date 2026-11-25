import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { OPTIONAL_STORAGE_KEY, setOptionalStorageOff } from "../../hooks/optionalStorage";
import {
  STORAGE_PREFERENCE_LABEL,
  STORAGE_PREFERENCE_OFF,
  STORAGE_PREFERENCE_ON,
  StoragePreference,
} from "./StoragePreference";

const meta: Meta<typeof StoragePreference> = {
  title: "3. Patterns/StoragePreference",
  component: StoragePreference,
  parameters: { layout: "padded" },
  beforeEach: () => {
    setOptionalStorageOff(false);
    return () => setOptionalStorageOff(false);
  },
};

export default meta;
type Story = StoryObj<typeof StoragePreference>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const control = canvas.getByRole("switch", { name: STORAGE_PREFERENCE_LABEL });
  await expect(control).toBeChecked();
  await expect(canvas.getByText(STORAGE_PREFERENCE_ON)).toBeInTheDocument();

  window.sessionStorage.setItem("flump.scene-settled.story", "1");
  await userEvent.click(control);
  await expect(control).not.toBeChecked();
  await expect(canvas.getByText(STORAGE_PREFERENCE_OFF)).toBeInTheDocument();
  await expect(window.localStorage.getItem(OPTIONAL_STORAGE_KEY)).toBe("off");
  await expect(window.sessionStorage.getItem("flump.scene-settled.story")).toBeNull();

  await userEvent.click(control);
  await expect(control).toBeChecked();
  await expect(window.localStorage.getItem(OPTIONAL_STORAGE_KEY)).toBeNull();
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play,
};
