import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import { css } from "../../../styled-system/css";
import { SegmentedTabs } from "../../primitives/SegmentedTabs";
import { SliderField } from "../../primitives/SliderField";
import { SCENARIO_RESET_LABEL, ScenarioZone } from "./ScenarioZone";

const meta: Meta<typeof ScenarioZone> = {
  title: "3. Financial Patterns & Sections/ScenarioZone",
  component: ScenarioZone,
  parameters: { layout: "padded" },
  args: {
    basis: "Starting from your figures: £182,400 at 4.5%, 22 years left",
  },
};

export default meta;
type Story = StoryObj<typeof ScenarioZone>;

const link = css({ color: "primary", textDecoration: "underline", fontWeight: "medium" });
const outcome = css({
  margin: "0",
  color: "text.primary",
  fontVariantNumeric: "tabular-nums",
});

const UpdateLink = () => (
  <a className={link} href="#edit">
    Update your details
  </a>
);

const OverpaymentTool = ({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number) => void;
}) => (
  <>
    <SliderField
      format="currency"
      label="Extra monthly payment"
      max={1000}
      min={0}
      onChange={onChange}
      step={25}
      value={value}
    />
    <p className={outcome}>Interest saved: £{((value ?? 0) * 38).toLocaleString("en-GB")}</p>
  </>
);

export const Default: Story = {
  args: { footer: <UpdateLink /> },
  render: (args) => (
    <ScenarioZone {...args}>
      <OverpaymentTool onChange={() => {}} value={null} />
    </ScenarioZone>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("region", { name: "Model a change" })).toBeInTheDocument();
    await expect(canvas.getByText("Illustration, not saved")).toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: SCENARIO_RESET_LABEL })).toBeNull();
  },
};

const Interactive = () => {
  const [extra, setExtra] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const modified = extra !== null && extra !== 0;
  return (
    <ScenarioZone
      announcement={announcement}
      basis="Starting from your figures: £182,400 at 4.5%, 22 years left"
      footer={<UpdateLink />}
      isModified={modified}
      onReset={() => {
        setExtra(null);
        setAnnouncement("Back to your saved figures");
      }}
    >
      <OverpaymentTool
        onChange={(v) => {
          setExtra(v);
          setAnnouncement(`Interest saved £${(v * 38).toLocaleString("en-GB")}`);
        }}
        value={extra}
      />
    </ScenarioZone>
  );
};

export const Modified: Story = {
  render: () => <Interactive />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("button", { name: SCENARIO_RESET_LABEL })).toBeNull();
    const slider = canvas.getByRole("slider");
    slider.focus();
    await userEvent.keyboard("{ArrowRight}");
    const reset = await canvas.findByRole("button", { name: SCENARIO_RESET_LABEL });
    await expect(reset).toBeInTheDocument();
    await waitFor(
      () => expect(canvas.getByRole("status")).toHaveTextContent(/^Illustration: Interest saved/),
      { timeout: 3000 },
    );
    await userEvent.click(reset);
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: SCENARIO_RESET_LABEL })).toBeNull(),
    );
    await waitFor(
      () =>
        expect(canvas.getByRole("status")).toHaveTextContent(
          "Illustration: Back to your saved figures",
        ),
      { timeout: 3000 },
    );
  },
};

export const ResetVisible: Story = {
  args: { isModified: true, footer: <UpdateLink />, announcement: "Interest saved £3,800" },
  render: (args) => (
    <ScenarioZone {...args}>
      <OverpaymentTool onChange={() => {}} value={100} />
    </ScenarioZone>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: SCENARIO_RESET_LABEL })).toBeInTheDocument();
  },
};

const WithTabs = () => {
  const [tool, setTool] = useState("overpayment");
  return (
    <ScenarioZone
      basis="Starting from your figures: £182,400 at 4.5%, 22 years left"
      footer={<UpdateLink />}
      isModified
      onReset={() => setTool("overpayment")}
      tools={
        <SegmentedTabs
          aria-label="Scenario tools"
          items={[
            { value: "overpayment", label: "Overpayment" },
            { value: "rate-change", label: "Rate change" },
            { value: "overpay-vs-save", label: "Overpay or save" },
          ]}
          onValueChange={setTool}
          panels={{
            overpayment: <OverpaymentTool onChange={() => {}} value={150} />,
            "rate-change": <p className={outcome}>Try a different rate from 5.2%.</p>,
            "overpay-vs-save": <p className={outcome}>Compare overpaying with saving.</p>,
          }}
          value={tool}
        />
      }
    />
  );
};

export const WithToolTabs: Story = {
  render: () => <WithTabs />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: "Rate change" }));
    await expect(canvas.getByRole("tab", { name: "Rate change" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  },
};

export const LongContent: Story = {
  args: {
    isModified: true,
    title: "Model a change with your remaining mortgage balance and a longer term",
    basis:
      "Starting from your figures: £1,248,350.75 at 4.875% fixed until 31 March 2029, 27 years and 4 months left on the term",
    footer: <UpdateLink />,
  },
  render: (args) => (
    <ScenarioZone {...args}>
      <OverpaymentTool onChange={() => {}} value={750} />
      <p className={outcome}>
        Overpaying £750 a month would clear the balance about 6 years and 2 months sooner and save
        roughly £182,415 in interest over the life of the loan, before any early repayment charge.
      </p>
    </ScenarioZone>
  ),
};

export const Narrow: Story = {
  args: { isModified: true, footer: <UpdateLink /> },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => (
    <div className={css({ maxWidth: "343px" })}>
      <ScenarioZone {...args}>
        <OverpaymentTool onChange={() => {}} value={150} />
      </ScenarioZone>
    </div>
  ),
};
