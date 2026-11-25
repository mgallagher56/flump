import { type ComponentType, createElement, type ReactElement } from "react";
import { Button } from "../../components/Button";
import { buttonStates } from "../../components/Button/Button.states";
import { Card } from "../../components/Card";
import { cardStates } from "../../components/Card/Card.states";
import { FlumpLogo } from "../../components/FlumpLogo";
import { flumpLogoStates } from "../../components/FlumpLogo/FlumpLogo.states";
import { Pressable } from "../../components/Pressable";
import { pressableStates } from "../../components/Pressable/Pressable.states";
import { Screen } from "../../components/Screen";
import { screenStates } from "../../components/Screen/Screen.states";
import { Text } from "../../components/Text";
import { textStates } from "../../components/Text/Text.states";

export interface GalleryState {
  readonly name: string;
  readonly render: () => ReactElement;
}

export interface GalleryEntry {
  readonly component: string;
  readonly states: readonly GalleryState[];
}

function entry<P extends object>(
  component: string,
  Component: ComponentType<P>,
  states: Record<string, P>,
): GalleryEntry {
  return {
    component,
    states: Object.entries(states).map(([name, props]) => ({
      name,
      render: () => createElement(Component, props),
    })),
  };
}

/** Every component in `src/components`, with every named state from its `X.states.ts`. */
export const GALLERY: readonly GalleryEntry[] = [
  entry("Text", Text, textStates),
  entry("Pressable", Pressable, pressableStates),
  entry("Button", Button, buttonStates),
  entry("Card", Card, cardStates),
  entry("Screen", Screen, screenStates),
  entry("FlumpLogo", FlumpLogo, flumpLogoStates),
];
