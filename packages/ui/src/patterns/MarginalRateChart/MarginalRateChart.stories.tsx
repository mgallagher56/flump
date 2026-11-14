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
    title: "Estimated share deducted from the next £1,000, by pay",
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
        name: "Estimated share deducted from the next £1,000, by pay",
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

/** As on the signed-in take-home page: only the thresholds either side of your pay. */
export const NearPay: Story = {
  args: { thresholdFocus: "near-pay", yourPay: 58_000 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByTestId("marginal-rate-threshold")).toHaveLength(2);
    await expect(canvas.getByTestId("marginal-rate-your-pay")).toBeInTheDocument();
  },
};

export const NearPayDark: Story = { ...NearPay, globals: { theme: "dark" } };

/** As on the signed-in take-home page: one marker, the line named at its end, no axis title. */
export const Zone: Story = {
  args: { variant: "zone", steppedZones: [], title: "Share deducted, by pay", yourPay: 32_000 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryAllByTestId("marginal-rate-threshold")).toHaveLength(0);
    await expect(canvas.getByTestId("marginal-rate-line-label")).toBeInTheDocument();
  },
};

export const ZoneDark: Story = { ...Zone, globals: { theme: "dark" } };

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const Dark: Story = { ...Default, globals: { theme: "dark" } };
