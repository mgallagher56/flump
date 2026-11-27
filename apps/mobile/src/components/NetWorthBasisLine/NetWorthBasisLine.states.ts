import type { NetWorthBasisLineProps } from "./NetWorthBasisLine";

const noop = () => {};

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const netWorthBasisLineStates = {
  studentLoan: { leftOut: ["studentLoan"], onChangeWhatCounts: noop, onAddEstimate: noop },
  propertyAndMortgage: {
    leftOut: ["property", "mortgage"],
    onChangeWhatCounts: noop,
    onAddEstimate: noop,
  },
  everything: {
    leftOut: ["property", "mortgage", "studentLoan"],
    onChangeWhatCounts: noop,
    onAddEstimate: noop,
  },
  homeValueMissing: {
    leftOut: ["homeValueMissing"],
    onChangeWhatCounts: noop,
    onAddEstimate: noop,
  },
  websiteOnly: {
    leftOut: ["homeValueMissing"],
    onChangeWhatCounts: noop,
    onAddEstimate: noop,
    estimateWebsiteLabel: "Open the Flump website",
  },
  linkOnly: {
    leftOut: [],
    onChangeWhatCounts: noop,
    onAddEstimate: noop,
    alwaysShowLink: true,
  },
} satisfies Record<string, NetWorthBasisLineProps>;
