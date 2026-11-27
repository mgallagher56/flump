/**
 * The keyboard's height while it is open, for a form that must scroll clear of it (E12 S8 device
 * check, 27 November 2026). Edge to edge on Android the window no longer shrinks for the keyboard,
 * and `KeyboardAvoidingView` measured from under the stack header padded too little: at 200% text
 * Save stayed under the keyboard. So the screen adds the keyboard's height below its content and
 * scrolls the field being typed in above the keyboard itself, the same on both platforms.
 */
import { createContext, useContext, useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/** The keyboard's height in points, 0 while it is closed. */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    // iOS tells before the keyboard moves, Android only after.
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const shown = Keyboard.addListener(show, (e) => setInset(Math.max(0, e.endCoordinates.height)));
    const hidden = Keyboard.addListener(hide, () => setInset(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return inset;
}

export interface FieldInView {
  /** The field's top and height inside the scrolled content. */
  fieldY: number;
  fieldHeight: number;
  /** How far the content is scrolled now. */
  scrollY: number;
  /** The scroll area's height on screen. */
  viewport: number;
  /** The keyboard's height, covering the bottom of the scroll area. */
  inset: number;
  /** Room to leave between the field and the keyboard. */
  margin: number;
}

/**
 * Where to scroll so the field sits above the keyboard, or null when it already does. A field
 * taller than the space left is lined up with the top instead, so its start is what shows.
 */
export function scrollToShowField({
  fieldY,
  fieldHeight,
  scrollY,
  viewport,
  inset,
  margin,
}: FieldInView): number | null {
  const visibleTop = scrollY;
  const visibleBottom = scrollY + viewport - inset;
  const fieldBottom = fieldY + fieldHeight + margin;
  if (fieldY >= visibleTop && fieldBottom <= visibleBottom) return null;
  const room = viewport - inset;
  if (fieldHeight + margin > room || fieldY < visibleTop) return Math.max(0, fieldY - margin);
  return Math.max(0, fieldBottom - room);
}

/**
 * Scrolls the field being typed in above the keyboard, given by a form's `Screen` (a no-op
 * anywhere else). Each text control calls it when it gains focus, because moving between fields
 * with the keyboard already open sends no keyboard event, and Android's scroll view counts the
 * part behind the keyboard as visible.
 */
export const ScrollFieldIntoView = createContext<() => void>(() => {});

/** The form's way to bring the focused field above the keyboard. */
export function useScrollFieldIntoView(): () => void {
  return useContext(ScrollFieldIntoView);
}
