import { createElement } from "react";
import { Text } from "../Text";
import type { ScreenProps } from "./Screen";

// A .ts file (the native file set), so the element is made without JSX.
const body = (words: string) => createElement(Text, null, words);

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const screenStates = {
  scrolling: { children: body("A screen that scrolls.") },
  centred: { children: body("Short content in the middle."), centred: true },
  fixed: { children: body("A screen that manages its own scrolling."), scroll: false },
  form: { children: body("A form above the keyboard."), keyboardAware: true },
  underHeader: { children: body("Under a stack header."), edges: ["right", "bottom", "left"] },
} satisfies Record<string, ScreenProps>;
