import { createElement } from "react";
import { Text } from "../Text";
import type { PressableProps } from "./Pressable";

// A .ts file (the native file set), so the element is made without JSX.
const words = (text: string) => createElement(Text, null, text);

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const pressableStates = {
  text: { children: words("Plain pressable") },
  link: { children: words("A link"), accessibilityRole: "link" },
  busy: { children: words("Busy"), busy: true },
  disabled: { children: words("Not available"), disabled: true },
} satisfies Record<string, PressableProps>;
