import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import { css } from "../../../styled-system/css";
import { Button } from "../../primitives/Button/Button";
import { SliderField } from "../../primitives/SliderField";
import { Tabs } from "../../primitives/Tabs";
import { ResultBlock } from "../ResultBlock/ResultBlock";
import { SCENARIO_RESET_LABEL, ScenarioZone } from "./ScenarioZone";

const meta: Meta<typeof ScenarioZone> = {
  title: "3. Patterns/ScenarioZone",
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
  args: { footer: <UpdateLink />, onReset: () => {} },
  render: (args) => (
    <ScenarioZone {...args}>
      <OverpaymentTool onChange={() => {}} value={null} />
    </ScenarioZone>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("region", { name: "Model a change" })).toBeInTheDocument();
    await expect(canvas.getByText("Illustration, not saved")).toBeInTheDocument();
    // Nothing differs from the saved figures yet, so there is no Reset (E16 round 3).
    await expect(canvas.queryByRole("button", { name: SCENARIO_RESET_LABEL })).toBeNull();
    // The footer holds "Update your details" and the page's single notice.
    const footer = canvas.getByTestId("scenario-zone-footer");
    await expect(footer).toContainElement(
      canvas.getByRole("link", { name: "Update your details" }),
    );
    await expect(footer).toContainElement(
      canvas.getByRole("note", { name: "Guidance, not advice" }),
    );
  },
};

export const DefaultDark: Story = { ...Default, globals: { theme: "dark" } };

/** Under a page section's own h2, the zone's heading steps down a level. */
export const HeadingLevelThree: Story = {
  args: { footer: <UpdateLink />, headingAs: "h3" },
  render: (args) => (
    <section aria-labelledby="scenario-section-heading">
      <h2 id="scenario-section-heading">Your mortgage</h2>
      <ScenarioZone {...args}>
        <OverpaymentTool onChange={() => {}} value={null} />
      </ScenarioZone>
    </section>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 3, name: "Model a change" }),
    ).toBeInTheDocument();
    await expect(canvas.getByRole("region", { name: "Model a change" })).toBeInTheDocument();
  },
};

export const HeadingLevelThreeDark: Story = { ...HeadingLevelThree, globals: { theme: "dark" } };

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
    await waitFor(
      () => expect(canvas.getByRole("status")).toHaveTextContent(/^Illustration: Interest saved/),
      { timeout: 3000 },
    );
    await userEvent.click(reset);
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: SCENARIO_RESET_LABEL })).toBeNull(),
    );
    // Focus lands on the zone heading, not on the body, once the button goes.
    await expect(canvas.getByTestId("scenario-zone-title")).toHaveFocus();
    await waitFor(
      () =>
        expect(canvas.getByRole("status")).toHaveTextContent(
          "Illustration: Back to your saved figures",
        ),
      { timeout: 3000 },
    );
  },
};

export const ModifiedDark: Story = { ...Modified, globals: { theme: "dark" } };

export const ResetVisible: Story = {
  args: {
    isModified: true,
    onReset: () => {},
    footer: <UpdateLink />,
    announcement: "Interest saved £3,800",
  },
  render: (args) => (
    <ScenarioZone {...args}>
      <OverpaymentTool onChange={() => {}} value={100} />
    </ScenarioZone>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: SCENARIO_RESET_LABEL })).toBeEnabled();
  },
};

export const ResetVisibleDark: Story = { ...ResetVisible, globals: { theme: "dark" } };

const WithTabs = () => {
  const [tool, setTool] = useState("overpayment");
  return (
    <ScenarioZone
      basis="Starting from your figures: £182,400 at 4.5%, 22 years left"
      footer={<UpdateLink />}
      isModified
      onReset={() => setTool("overpayment")}
      tools={
        <Tabs
          aria-label="Scenario tools"
          size="sm"
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

export const WithToolTabsDark: Story = { ...WithToolTabs, globals: { theme: "dark" } };

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
  args: { isModified: true, onReset: () => {}, footer: <UpdateLink /> },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => (
    <div className={css({ maxWidth: "343px" })}>
      <ScenarioZone {...args}>
        <OverpaymentTool onChange={() => {}} value={150} />
      </ScenarioZone>
    </div>
  ),
};

/**
 * Round 4: the footer's "Update your details" as a ghost button. Without Reset (nothing changed)
 * its text sits at the zone's leading edge, as with Reset in front of it.
 */
const GhostUpdate = () => (
  <Button size="sm" variant="ghost">
    Update your details
  </Button>
);

const leadingEdgePlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const zone = canvas.getByTestId("scenario-zone");
  const button = canvas.getByRole("button", { name: "Update your details" });
  const label = button.firstChild as Node;
  const range = document.createRange();
  range.selectNodeContents(label);
  const textLeft = range.getBoundingClientRect().left;
  const footer = canvas.getByTestId("scenario-zone-footer");
  // The text starts where the footer's content box starts, give or take a pixel.
  const footerLeft = footer.getBoundingClientRect().left;
  await expect(Math.abs(textLeft - footerLeft)).toBeLessThan(2);
  await expect(zone).toBeInTheDocument();
};

export const FooterWithoutReset: Story = {
  render: () => (
    <ScenarioZone footer={<GhostUpdate />} onReset={() => {}}>
      <OverpaymentTool onChange={() => {}} value={null} />
    </ScenarioZone>
  ),
  play: leadingEdgePlay,
};

export const FooterWithReset: Story = {
  render: () => (
    <ScenarioZone footer={<GhostUpdate />} isModified onReset={() => {}}>
      <OverpaymentTool onChange={() => {}} value={100} />
    </ScenarioZone>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: SCENARIO_RESET_LABEL })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Update your details" })).toBeInTheDocument();
  },
};

export const FooterWithoutResetDark: Story = { ...FooterWithoutReset, globals: { theme: "dark" } };

const fieldStack = css({ display: "flex", flexDirection: "column", gap: "4" });

const WithResultBlock = () => {
  const [cut, setCut] = useState(0);
  const months = Math.round((4200 / (2800 - cut)) * 10) / 10;
  return (
    <ScenarioZone
      announcement={cut > 0 ? `About ${months} months of breathing room` : ""}
      basis="Starting from your saved budget and accounts."
      isModified={cut > 0}
      result={
        <ResultBlock
          figure={`${months} months`}
          label="Breathing room in this illustration"
          leadIn="About"
          row={{ label: "Money to draw on", value: "£4,200" }}
        />
      }
      title="Model a change to your budget"
      onReset={() => setCut(0)}
    >
      <div className={fieldStack}>
        <SliderField
          label="Spending you would cut each month"
          max={1000}
          min={0}
          step={50}
          format="currency"
          value={cut}
          onChange={setCut}
        />
      </div>
    </ScenarioZone>
  );
};

const resultPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const zone = canvas.getByTestId("scenario-zone");
  // E17 5A: exactly one result card in a zone, and the badge still says it is not saved.
  await expect(within(zone).getAllByRole("group", { name: /Breathing room/ })).toHaveLength(1);
  await expect(canvas.getByText("Illustration, not saved")).toBeVisible();
  await expect(canvas.getByTestId("scenario-zone-result")).toHaveTextContent("About 1.5 months");
};

/** E17 5A: the zone presents its outcome in one result block, right of the inputs from tablet. */
export const WithResult: Story = {
  globals: { theme: "light" },
  render: () => <WithResultBlock />,
  play: resultPlay,
};

export const WithResultDark: Story = { ...WithResult, globals: { theme: "dark" } };

export const WithResultPhone: Story = {
  ...WithResult,
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
