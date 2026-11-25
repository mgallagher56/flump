import { createElement } from "react";
import { Text } from "../Text";
import type { CardProps } from "./Card";

// A .ts file (the native file set), so the element is made without JSX.
const body = (words: string) => createElement(Text, null, words);

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const cardStates = {
  default: { children: body("A card on the card surface.") },
  subtle: { children: body("A quieter block."), surface: "subtle" },
  sunken: { children: body("A sunken block."), surface: "sunken", elevation: "none" },
  compact: { children: body("Small padding."), padding: "sm" },
  roomy: { children: body("Large padding."), padding: "lg" },
} satisfies Record<string, CardProps>;
