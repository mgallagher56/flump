import type { ReactNode } from "react";
import { FlumpLogo } from "../../components/FlumpLogo";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";

export interface StatusMessageProps {
  heading: string;
  body?: string;
  /** The way on: one or two buttons. */
  children?: ReactNode;
}

/** The shared layout of the signed-in placeholder and the sign-in status screens. */
export function StatusMessage({ heading, body, children }: StatusMessageProps) {
  return (
    <Screen centred>
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
