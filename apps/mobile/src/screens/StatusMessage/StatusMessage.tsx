import type { ReactNode } from "react";
import type { Edge } from "react-native-safe-area-context";
import { FlumpLogo } from "../../components/FlumpLogo";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";

export interface StatusMessageProps {
  heading: string;
  body?: string;
  /** The way on: one or two buttons. */
  children?: ReactNode;
  /** Safe-area edges to pad; a screen under a header and above the tab bar pads only the sides. */
  edges?: readonly Edge[];
}

/** The shared layout of the signed-in placeholder and the sign-in status screens. */
export function StatusMessage({ heading, body, children, edges }: StatusMessageProps) {
  return (
    <Screen centred edges={edges}>
      <FlumpLogo size="md" />
      <Text accessibilityRole="header" textStyle="heading.md">
        {heading}
      </Text>
      {body ? (
        <Text textStyle="body.md" color="secondary">
          {body}
        </Text>
      ) : null}
      {children}
    </Screen>
  );
}
