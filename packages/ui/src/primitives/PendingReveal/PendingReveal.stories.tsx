import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import { css } from "../../../styled-system/css";
import { Button } from "../Button/Button";
import { Skeleton } from "../Skeleton/Skeleton";
import { PendingReveal } from "./PendingReveal";

const meta: Meta<typeof PendingReveal> = {
  title: "2. Primitives/PendingReveal",
  component: PendingReveal,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof PendingReveal>;

const Card = () => (
  <div className={css({ display: "grid", gap: "2", height: "6rem" })}>
    <p className={css({ textStyle: "label.md", color: "text.secondary" })}>Savings</p>
    <p className={css({ textStyle: "heading.md", fontVariantNumeric: "tabular-nums" })}>£3,200</p>
  </div>
);

const Placeholder = () => (
  <div className={css({ display: "grid", gap: "2", height: "6rem" })}>
    <Skeleton shape="text" />
    <Skeleton shape="line" />
  </div>
);

/** Press the button to simulate a load of the chosen length. */
const Demo = ({ loadMs }: { loadMs: number }) => {
  const [pending, setPending] = useState(false);
  return (
    <div className={css({ display: "grid", gap: "4", maxWidth: "320px" })}>
      <Button
        onClick={() => {
          setPending(true);
          setTimeout(() => setPending(false), loadMs);
        }}
        variant="secondary"
      >
        Load ({loadMs}ms)
      </Button>
      <PendingReveal fallback={<Placeholder />} pending={pending}>
        <Card />
      </PendingReveal>
    </div>
  );
};

export const FastLoad: Story = {
  render: () => <Demo loadMs={100} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Load/ }));
    // A load under the delay never shows the placeholder.
    await waitFor(() => expect(canvas.getByText("£3,200")).toBeInTheDocument());
  },
};

export const SlowLoad: Story = { render: () => <Demo loadMs={1200} /> };

export const Placeholders: Story = {
  render: () => (
    <PendingReveal fallback={<Placeholder />} pending>
      <Card />
    </PendingReveal>
  ),
};

export const Dark: Story = { ...SlowLoad, globals: { theme: "dark" } };
