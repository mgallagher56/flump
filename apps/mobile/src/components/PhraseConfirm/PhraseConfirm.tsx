import { useMemo, useState } from "react";
// Raw React Native inputs are allowed inside src/components (biome.json, apps/mobile override).
import { TextInput, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { FormField } from "../FormField";
import { InlineAlert } from "../InlineAlert";
import type { InlineAlertTone } from "../InlineAlert/InlineAlert.styles";
import { createStyles } from "./PhraseConfirm.styles";

export interface PhraseConfirmProps {
  /** The phrase to type, as the backend checks it ("DELETE"). */
  phrase: string;
  /** The field's label, which is also its accessible name ("Type DELETE to confirm"). */
  label: string;
  /** The danger button's words. */
  confirmLabel: string;
  /** Its words while the request is out. */
  pendingLabel: string;
  pending?: boolean;
  /** No request can be sent now (offline): the button stays disabled whatever is typed. */
  disabled?: boolean;
  /** What the last attempt came to. */
  message?: { text: string; tone: InlineAlertTone } | null;
  /** A follow-up the message offers, such as "Sign in again". */
  action?: { label: string; onPress(): void; pending?: boolean } | null;
  onConfirm(): void;
  testID?: string;
}

/** As web's `FinishDeletionPanel`: surrounding spaces and letter case do not matter. */
export function phraseMatches(typed: string, phrase: string): boolean {
  return typed.trim().toLowerCase() === phrase.toLowerCase();
}

/**
 * A typed-phrase confirmation for a total loss (COPY-GUIDE 5.9): the danger button stays disabled,
 * in the plain disabled colours, until the phrase is typed. The platform alert cannot hold a field,
 * so this sits on its own page instead of in a dialog (plan 9.10).
 */
export function PhraseConfirm({
  phrase,
  label,
  confirmLabel,
  pendingLabel,
  pending = false,
  disabled = false,
  message,
  action,
  onConfirm,
  testID,
}: PhraseConfirmProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [typed, setTyped] = useState("");
  const matches = phraseMatches(typed, phrase);
  return (
    <View style={styles.base} testID={testID}>
      <FormField label={label}>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          accessibilityLabel={label}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          editable={!pending}
          accessibilityState={{ disabled: pending }}
          style={[styles.input, pending ? styles.inputLocked : null]}
          testID={testID ? `${testID}-field` : undefined}
        />
      </FormField>
      <Button
        label={pending ? pendingLabel : confirmLabel}
        variant="danger"
        size="lg"
        pending={pending}
        disabled={disabled || (!matches && !pending)}
        testID={testID ? `${testID}-confirm` : undefined}
        onPress={() => {
          if (matches && !pending && !disabled) onConfirm();
        }}
      />
      {message ? <InlineAlert message={message.text} tone={message.tone} /> : null}
      {message && action ? (
        <Button
          label={action.label}
          variant="secondary"
          pending={action.pending}
          testID={testID ? `${testID}-action` : undefined}
          onPress={action.onPress}
        />
      ) : null}
    </View>
  );
}
