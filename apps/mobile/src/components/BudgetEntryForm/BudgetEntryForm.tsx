import { useMemo, useState } from "react";
import { View } from "react-native";
import { addToLabel, categoryLabel, EDITOR, FREQUENCY_OPTIONS } from "../../copy/budget";
import { SAVE_NEEDS_CONNECTION } from "../../copy/offline";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { CurrencyInput } from "../CurrencyInput";
import { FormField } from "../FormField";
import { InlineAlert } from "../InlineAlert";
import { OptionList } from "../OptionList";
import { Switch } from "../Switch";
import { Text } from "../Text";
import { TextField } from "../TextField";
import { createStyles } from "./BudgetEntryForm.styles";

type Frequency = (typeof FREQUENCY_OPTIONS)[number]["value"];

/** What the form edits. `amount` is null until one is typed: blank is never £0. */
export interface EntryValues {
  name: string;
  amount: number | null;
  frequency: Frequency;
  category: string;
  isEssential: boolean;
}

/** A form that passed its checks: a name and an amount. */
export type ValidEntryValues = EntryValues & { amount: number };

export interface BudgetEntryFormProps {
  mode: "add" | "edit";
  initial: EntryValues;
  /** The existing categories an entry may sit in, in the editor's order. */
  categories: readonly string[];
  /** A save or delete is running: the buttons say so and ignore presses. */
  saving?: boolean;
  /** What went wrong with the last save or delete, in web's words. */
  error?: string | null;
  /**
   * The connection dropped while the form was open (E12 S7 follow-up): what was typed stays and can
   * still be changed, Save and Delete are off, and one line says saving needs a connection.
   */
  offline?: boolean;
  onSave(values: ValidEntryValues): void;
  /** Every press of Save, before the checks: the screen clears the last save's error. */
  onTry?: () => void;
  /**
   * What is wrong with a typed amount, in words, or null: the account forms' one check (a minus,
   * text it cannot read, over the contract's limit), given by the screen. A blank amount is this
   * form's own "Enter an amount". Without it only a blank or unreadable amount is refused.
   */
  checkAmount?: (value: number | null, text: string) => string | null;
  /** A Save refused for a field: the screen brings the top of the form, with its alert, into view. */
  onInvalid?: () => void;
  onCancel(): void;
  /** Edit only: asks to delete the entry (the screen confirms first). */
  onDelete?: () => void;
  /** Defaults to "budget-entry-form". */
  testID?: string;
}

/** The income category: always counted, so it has no Essential switch (web's editor). */
const INCOME = "income";

/**
 * Add or edit one of the person's own budget entries, with web's labels (`BudgetEntryDialog`):
 * name, amount, how often, the category it sits in and, for spending, "Essential spending". A
 * missing name or amount says what is needed (copy guide 5.6) and sends nothing. It saves nothing
 * itself: the screen sends the change and passes back what went wrong.
 */
export function BudgetEntryForm({
  mode,
  initial,
  categories,
  saving = false,
  error = null,
  offline = false,
  onSave,
  onTry,
  checkAmount,
  onInvalid,
  onCancel,
  onDelete,
  testID = "budget-entry-form",
}: BudgetEntryFormProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [values, setValues] = useState<EntryValues>(initial);
  const [tried, setTried] = useState(false);
  const [amountText, setAmountText] = useState(() =>
    initial.amount === null ? "" : String(initial.amount),
  );
  const set = <K extends keyof EntryValues>(key: K, value: EntryValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const nameError = tried && values.name.trim() === "" ? EDITOR.nameMissing : null;
  const amountProblem =
    values.amount === null && amountText.trim() === ""
      ? EDITOR.amountMissing
      : checkAmount
        ? checkAmount(values.amount, amountText)
        : values.amount === null
          ? EDITOR.amountMissing
          : null;
  const amountOk = values.amount !== null && amountProblem === null;
  const amountError = tried ? amountProblem : null;
  const invalid = tried && (nameError !== null || amountError !== null);
  const options = categories.map((c) => ({ value: c, label: categoryLabel(c) }));

  const submit = () => {
    if (offline) return;
    onTry?.();
    setTried(true);
    const name = values.name.trim();
    if (name === "" || values.amount === null || !amountOk) {
      onInvalid?.();
      return;
    }
    onSave({ ...values, name, amount: values.amount });
  };

  return (
    <View style={styles.base} testID={testID}>
      <Text accessibilityRole="header" textStyle="heading.md">
        {mode === "add" ? addToLabel(initial.category) : EDITOR.editTitle}
      </Text>
      {offline ? (
        <InlineAlert tone="info" message={SAVE_NEEDS_CONNECTION} testID={`${testID}-offline`} />
      ) : null}
      {error ? <InlineAlert message={error} testID={`${testID}-error`} /> : null}
      {invalid ? <InlineAlert message={EDITOR.fixFields} testID={`${testID}-fix`} /> : null}
      <FormField label={EDITOR.name} error={nameError}>
        <TextField
          value={values.name}
          onChangeText={(name) => set("name", name)}
          accessibilityLabel={EDITOR.name}
          testID={`${testID}-name`}
        />
      </FormField>
      <FormField label={EDITOR.amount} error={amountError}>
        <CurrencyInput
          value={values.amount}
          onValueChange={(amount, text) => {
            set("amount", amount);
            setAmountText(text);
          }}
          accessibilityLabel={EDITOR.amount}
          testID={`${testID}-amount`}
        />
      </FormField>
      <OptionList
        label={EDITOR.frequency}
        options={FREQUENCY_OPTIONS}
        value={values.frequency}
        onChange={(frequency) => set("frequency", frequency)}
        testID={`${testID}-frequency`}
      />
      <OptionList
        label={EDITOR.category}
        options={options}
        value={values.category}
        onChange={(category) => set("category", category)}
        testID={`${testID}-category`}
      />
      {values.category === INCOME ? null : (
        <Switch
          label={EDITOR.essential}
          value={values.isEssential}
          onValueChange={(isEssential) => set("isEssential", isEssential)}
          testID={`${testID}-essential`}
        />
      )}
      <View style={styles.actions}>
        <Button
          label={EDITOR.save}
          pending={saving}
          disabled={offline}
          testID={`${testID}-save`}
          onPress={submit}
        />
        <Button
          label={EDITOR.cancel}
          variant="ghost"
          disabled={saving}
          testID={`${testID}-cancel`}
          onPress={onCancel}
        />
        {mode === "edit" && onDelete ? (
          <Button
            label={EDITOR.deleteEntry}
            variant="dangerSubtle"
            disabled={saving || offline}
            testID={`${testID}-delete`}
            onPress={onDelete}
          />
        ) : null}
      </View>
    </View>
  );
}
