import type { Meta, StoryObj } from "@storybook/react";
import { PensionWidget } from "./PensionWidget";

const meta: Meta<typeof PensionWidget> = {
  title: "Dashboard/Widgets/PensionWidget",
  component: PensionWidget,
  tags: ["autodocs"],
  args: {
    editMode: false,
    size: "normal",
    onToggleSize: () => {},
    onHide: () => {},
    onMoveUp: () => {},
    onMoveDown: () => {},
    data: {
      totalPensionBalance: 30000,
      potsCount: 1,
      employeePercent: 6,
      employerPercent: 4,
      isSalarySacrifice: false,
      monthlyContributionEst: 250,
    },
  },
};

export default meta;
type Story = StoryObj<typeof PensionWidget>;

export const CustomRates: Story = {};

/** The backend default 5% + 3% pair is labelled as a default the user may not have chosen. */
export const DefaultRatesLabelled: Story = {
  args: {
    data: {
      totalPensionBalance: 30000,
      potsCount: 1,
      employeePercent: 5,
      employerPercent: 3,
      isSalarySacrifice: false,
      monthlyContributionEst: 200,
    },
  },
};

export const RatesNotSet: Story = {
  args: {
    data: {
      totalPensionBalance: 30000,
      potsCount: 1,
      employeePercent: null,
      employerPercent: null,
      isSalarySacrifice: false,
      monthlyContributionEst: null,
    },
  },
};
