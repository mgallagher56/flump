import { createElement } from "react";
import { Text } from "../Text";
import type { DisclosureProps } from "./Disclosure";

const body = (words: string) => createElement(Text, null, words);

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const disclosureStates = {
  closed: {
    label: "Show changes by account",
    openLabel: "Hide changes by account",
    children: body("Each account's change between the last two months."),
  },
  open: {
    label: "Show changes by account",
    openLabel: "Hide changes by account",
    children: body("Each account's change between the last two months."),
    initiallyOpen: true,
  },
} satisfies Record<string, DisclosureProps>;
