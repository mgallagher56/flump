import { type ComponentType, createElement, type ReactElement } from "react";
import { Button } from "../../components/Button";
import { buttonStates } from "../../components/Button/Button.states";
import { Card } from "../../components/Card";
import { cardStates } from "../../components/Card/Card.states";
import { CurrencyInput } from "../../components/CurrencyInput";
import { currencyInputStates } from "../../components/CurrencyInput/CurrencyInput.states";
import { FlumpLogo } from "../../components/FlumpLogo";
import { flumpLogoStates } from "../../components/FlumpLogo/FlumpLogo.states";
import { FormField } from "../../components/FormField";
import { formFieldStates } from "../../components/FormField/FormField.states";
import { HeroFigure } from "../../components/HeroFigure";
import { heroFigureStates } from "../../components/HeroFigure/HeroFigure.states";
import { InlineAlert } from "../../components/InlineAlert";
import { inlineAlertStates } from "../../components/InlineAlert/InlineAlert.states";
import { Money } from "../../components/Money";
import { moneyStates } from "../../components/Money/Money.states";
import { Pressable } from "../../components/Pressable";
import { pressableStates } from "../../components/Pressable/Pressable.states";
import { Screen } from "../../components/Screen";
import { screenStates } from "../../components/Screen/Screen.states";
import { Skeleton } from "../../components/Skeleton";
import { skeletonStates } from "../../components/Skeleton/Skeleton.states";
import { StatusBadge } from "../../components/StatusBadge";
import { statusBadgeStates } from "../../components/StatusBadge/StatusBadge.states";
import { Text } from "../../components/Text";
import { textStates } from "../../components/Text/Text.states";
import { Toast } from "../../components/Toast";
import { toastStates } from "../../components/Toast/Toast.states";

interface GalleryState {
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
  entry("InlineAlert", InlineAlert, inlineAlertStates),
  entry("Money", Money, moneyStates),
  entry("StatusBadge", StatusBadge, statusBadgeStates),
  entry("Skeleton", Skeleton, skeletonStates),
  entry("HeroFigure", HeroFigure, heroFigureStates),
  entry("CurrencyInput", CurrencyInput, currencyInputStates),
  entry("FormField", FormField, formFieldStates),
  entry("Toast", Toast, toastStates),
];
