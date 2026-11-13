import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { Button } from "../Button";
import { type ToastOptions, ToastProvider, useToast } from "./Toast";

const Trigger = ({ label, options }: { label: string; options: ToastOptions }) => {
  const { toast } = useToast();
  return (
    <Button variant="secondary" onClick={() => toast(options)}>
      {label}
    </Button>
  );
};

const meta: Meta<typeof ToastProvider> = {
  title: "2. Primitives/Toast",
  component: ToastProvider,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ToastProvider>;

export const Default: Story = {
  render: () => <Trigger label="Copy link" options={{ title: "Copied" }} />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Copy link" }));
    await expect(await body.findByRole("list", { name: "Notifications" })).toHaveTextContent(
      "Copied",
    );
  },
};

export const ErrorPersists: Story = {
  render: () => (
    <Trigger
      label="Save"
      options={{
        title: "Could not save your changes",
        description: "Check your connection and try again.",
        tone: "danger",
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Save" }));
    const list = await body.findByRole("list", { name: "Notifications" });
    // Longer than the 5 s auto-dismiss of other tones would need; error toasts stay put.
    await new Promise((resolve) => setTimeout(resolve, 600));
    await expect(list).toHaveTextContent("Could not save your changes");
  },
};

export const DismissAndKeyboard: Story = {
  render: () => <Trigger label="Save" options={{ title: "Saved", durationMs: 0 }} />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Save" }));
    await body.findByRole("list", { name: "Notifications" });
    await userEvent.tab();
    await expect(body.getByRole("button", { name: "Dismiss" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(body.queryByRole("list")).toBeNull());
  },
};

const ALL_TONES: ToastOptions[] = [
  { title: "Copied", tone: "neutral", durationMs: 0 },
  { title: "Payment plan saved", tone: "positive", durationMs: 0 },
  {
    title: "Rates updated",
    description: "Figures now use the 2026/27 rates.",
    tone: "info",
    durationMs: 0,
  },
  { title: "Rate rises in March", tone: "warning", durationMs: 0 },
  {
    title: "We could not reach your bank",
    description: "Try again in a few minutes.",
    tone: "danger",
  },
];

const ShowAll = () => {
  const { toast } = useToast();
  return (
    <Button
      onClick={() => {
        for (const options of ALL_TONES) toast(options);
      }}
    >
      Show every tone
    </Button>
  );
};

export const AllTones: Story = {
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <ToastProvider maxVisible={5}>
        <Story />
      </ToastProvider>
    ),
  ],
  render: () => <ShowAll />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Show every tone" }));
    await waitFor(() => expect(body.getAllByRole("listitem")).toHaveLength(5));
  },
};

export const Dark: Story = { ...AllTones, globals: { theme: "dark" } };
