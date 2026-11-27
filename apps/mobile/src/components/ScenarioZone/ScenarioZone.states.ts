import { createElement } from "react";
import { Text } from "../Text";
import type { ScenarioZoneProps } from "./ScenarioZone";

const inputs = createElement(Text, null, "The inputs go here.");
const result = createElement(Text, { tabular: true }, "About 2.7 months");

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const scenarioZoneStates = {
  closed: {
    title: "Model a change to your budget",
    basis: "Starting from your saved budget and accounts.",
    summary: "Starts from your savings of £8,200 and essentials of £1,615 a month.",
    showLabel: "Show what-if: redundancy pay, a spending cut",
    collapsible: true,
    children: inputs,
    result,
  },
  open: {
    title: "Model a change to your budget",
    basis: "Starting from your saved budget and accounts.",
    children: inputs,
    result,
  },
  modified: {
    title: "Model a change to your budget",
    basis: "Starting from your saved budget and accounts.",
    children: inputs,
    result,
    isModified: true,
    onReset: () => undefined,
    announcement: "Breathing room, about 3 months",
  },
} satisfies Record<string, ScenarioZoneProps>;
