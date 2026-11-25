import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import type { WellbeingQuestionsApi } from "../../wellbeingQuestions";
import { WellbeingQuestions } from "./WellbeingQuestions";

const api = (due: boolean, sendFails = false): WellbeingQuestionsApi => ({
  loadStatus: async () => due,
  send: async () => {
    if (sendFails) throw new Error("unavailable");
  },
});

const meta: Meta<typeof WellbeingQuestions> = {
  title: "3. Patterns/Snapshot/WellbeingQuestions",
  component: WellbeingQuestions,
  parameters: { layout: "padded" },
  args: { api: api(true), onFinished: fn() },
};

export default meta;
type Story = StoryObj<typeof WellbeingQuestions>;

export const Asking: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Two optional questions")).toBeDefined();
    await expect(canvas.getAllByRole("radio")).toHaveLength(3);
  },
};
export const AskingDark: Story = { ...Asking, globals: { theme: "dark" } };

export const Thanked: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("radio", { name: "About the same" }));
    await userEvent.click(canvas.getByRole("button", { name: "Send answers" }));
    await expect(await canvas.findByText("Thank you for your answers.")).toBeDefined();
  },
};
export const ThankedDark: Story = { ...Thanked, globals: { theme: "dark" } };

export const SendFailed: Story = {
  args: { api: api(true, true) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("radio", { name: "More in control" }));
    await userEvent.click(canvas.getByRole("button", { name: "Send answers" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "We could not send that. Nothing was saved. Try again.",
    );
  },
};
export const SendFailedDark: Story = { ...SendFailed, globals: { theme: "dark" } };

/** Not due this quarter, switched off or the status failed: nothing shows. */
export const NotDue: Story = {
  args: { api: api(false) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText("Two optional questions")).toBeNull();
  },
};
export const NotDueDark: Story = { ...NotDue, globals: { theme: "dark" } };
