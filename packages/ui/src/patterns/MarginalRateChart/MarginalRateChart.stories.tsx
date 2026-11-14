import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { ProjectionNotice } from "../ProjectionNotice/ProjectionNotice";
import { MarginalRateChart } from "./MarginalRateChart";
import {
  SAMPLE_POINTS,
  SAMPLE_SUMMARY,
  SAMPLE_THRESHOLDS,
  SAMPLE_ZONES,
} from "./MarginalRateChart.fixtures";

const meta: Meta<typeof MarginalRateChart> = {
  title: "4. Charts/MarginalRateChart",
  component: MarginalRateChart,
  parameters: { layout: "padded" },
  args: {
    title: "Estimated share deducted from the next £1,000, by pay before tax",
    summary: SAMPLE_SUMMARY,
    points: SAMPLE_POINTS,
    thresholds: SAMPLE_THRESHOLDS,
    steppedZones: SAMPLE_ZONES,
    yourPay: 39_000,
    notice: <ProjectionNotice />,
  },
};

export default meta;
type Story = StoryObj<typeof MarginalRateChart>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("figure", {
        name: "Estimated share deducted from the next £1,000, by pay before tax",
      }),
    ).toBeInTheDocument();
    // Direct labels in place of a legend (P10.2).
    await expect(canvas.getByTestId("marginal-rate-line-label")).toHaveTextContent(
      "Share deducted",
    );
    // The threshold tooltip appears on hover and goes on leave.
    const hit = canvas.getAllByTestId("marginal-rate-threshold-hit")[1] as Element;
    await userEvent.hover(hit);
    await waitFor(() =>
      expect(canvas.getByTestId("marginal-rate-tooltip")).toHaveTextContent(
        "Higher rate (40%); National Insurance upper limit: £50,270 pay before tax",
      ),
    );
    await userEvent.unhover(hit);
    await waitFor(() => expect(canvas.queryByTestId("marginal-rate-tooltip")).toBeNull());
  },
};

export const NoChildBenefit: Story = {
  args: {
    steppedZones: [],
    thresholds: SAMPLE_THRESHOLDS.filter((t) => !t.label.startsWith("Child Benefit")),
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const Dark: Story = { ...Default, globals: { theme: "dark" } };
