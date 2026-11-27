import { type ComponentRef, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, Modal, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { pressedStyle } from "../Button/Button.styles";
import { useFieldHint } from "../FormField/FormField";
import { Icon } from "../Icon";
import { OptionList } from "../OptionList";
import { Pressable } from "../Pressable";
import { Text } from "../Text";
import { createStyles } from "./SelectField.styles";

const OPENS_LIST_HINT = "Opens a list to choose from";
const CANCEL = "Cancel";
/** The radio group's name inside the sheet: the sheet's title above it already says what for. */
const CHOOSE_ONE = "Choose one";

interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
}

export interface SelectFieldProps<T extends string> {
  /** The field's name, as the FormField label around it; also the sheet's title. */
  label: string;
  options: readonly Option<T>[];
  value: T;
  /** Called with the option chosen in the sheet; not called for the one already chosen. */
  onChange(value: T): void;
  /** Defaults to true. */
  editable?: boolean;
  /**
   * The row's test id. The sheet is `<testID>-sheet`, its options `<testID>-option-<value>` and
   * its cancel button `<testID>-cancel`.
   */
  testID?: string;
}

/** True while the phone asks for less motion, following changes to the setting. */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (live) setReduce(on);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      live = false;
      subscription?.remove();
    };
  }, []);
  return reduce;
}

/**
 * One choice from a list without a native picker (CROSS-PLATFORM section 5 exception): a row at
 * least 48 high showing the chosen option, which opens a sheet holding an `OptionList`. iOS shows
 * it as a page sheet; Android as a sheet from the bottom over a scrim, closed by the back button.
 * The sheet is modal for screen readers and moves their focus to its title when it opens. It slides
 * in, or appears at once when the phone asks for less motion. It changes nothing itself: the caller
 * keeps the value, and wraps the row in a FormField for the label, hint and error.
 */
export function SelectField<T extends string>({
  label,
  options,
  value,
  onChange,
  editable = true,
  testID,
}: SelectFieldProps<T>) {
  const theme = useTheme();
  const spokenHint = useFieldHint(OPENS_LIST_HINT);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reduceMotion = useReduceMotion();
  const [open, setOpen] = useState(false);
  const titleRef = useRef<ComponentRef<typeof View>>(null);
  const chosen = options.find((option) => option.value === value)?.label ?? "";
  const ios = Platform.OS === "ios";

  const close = () => setOpen(false);

  // Screen readers start on the sheet's title, so the person hears where they are. Where there is
  // no node handle to give (the new architecture may return none), the focus event goes to the view.
  const focusTitle = () => {
    const title = titleRef.current;
    if (!title) return;
    const node = findNodeHandle(title);
    if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
    else AccessibilityInfo.sendAccessibilityEvent(title, "focus");
  };

  const sheet = (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={ios ? styles.sheetIos : styles.sheetAndroid}
      accessibilityViewIsModal
      testID={testID ? `${testID}-sheet-body` : undefined}
    >
      <View style={styles.header}>
        <View
          ref={titleRef}
          accessible
          accessibilityRole="header"
          accessibilityLabel={label}
          style={styles.title}
        >
          <Text textStyle="heading.sm">{label}</Text>
        </View>
        <Button
          label={CANCEL}
          variant="ghost"
          testID={testID ? `${testID}-cancel` : undefined}
          onPress={close}
        />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        <OptionList
          label={CHOOSE_ONE}
          options={options}
          value={value}
          testID={testID ? `${testID}-option` : undefined}
          onChange={(next) => {
            onChange(next);
            close();
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${chosen}`}
        accessibilityHint={spokenHint}
        disabled={!editable}
        testID={testID}
        // Press feedback as the Button's: iOS dims, Android draws a ripple.
        android_ripple={{ color: theme.colors["surface.subtle"] }}
        style={({ pressed }) => [
          styles.row,
          editable ? null : styles.disabled,
          pressedStyle(pressed, Platform.OS),
        ]}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.chosen} color={editable ? "primary" : "secondary"}>
          {chosen}
        </Text>
        <Icon name="chevron-right" testID="select-chevron" />
      </Pressable>
      <Modal
        visible={open}
        animationType={reduceMotion ? "none" : "slide"}
        {...(ios
          ? { presentationStyle: "pageSheet" as const }
          : { transparent: true, statusBarTranslucent: true, navigationBarTranslucent: true })}
        onRequestClose={close}
        onShow={focusTitle}
        testID={testID ? `${testID}-sheet` : undefined}
      >
        {ios ? sheet : <View style={styles.backdrop}>{sheet}</View>}
      </Modal>
    </>
  );
}
