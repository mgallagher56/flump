import { act, renderHook } from "@testing-library/react-native";
import { Keyboard, type KeyboardEvent } from "react-native";
import { scrollToShowField, useKeyboardInset } from "./keyboardInset";

describe("scrollToShowField", () => {
  // A 700 point scroll area with a 330 point keyboard leaves 370 points to see, from scrollY.
  const base = { viewport: 700, inset: 330, margin: 16, scrollY: 0, fieldHeight: 56 };

  it("a field already above the keyboard needs no scroll", () => {
    // 100 + 56 + 16 = 172, inside 0 to 370.
    expect(scrollToShowField({ ...base, fieldY: 100 })).toBeNull();
    // Exactly on the edge: 298 + 56 + 16 = 370.
    expect(scrollToShowField({ ...base, fieldY: 298 })).toBeNull();
  });

  it("a field behind the keyboard scrolls up until its bottom clears it", () => {
    // 299 + 56 + 16 = 371, one over 370: scroll 1.
    expect(scrollToShowField({ ...base, fieldY: 299 })).toBe(1);
    // The 0% date's year box at 1,500: 1,500 + 56 + 16 - 370 = 1,202.
    expect(scrollToShowField({ ...base, fieldY: 1500 })).toBe(1202);
  });

  it("a field scrolled off the top lines up with the top", () => {
    // Scrolled to 500, the field at 200: 200 - 16 = 184.
    expect(scrollToShowField({ ...base, scrollY: 500, fieldY: 200 })).toBe(184);
  });

  it("a field taller than the room left shows its start", () => {
    // 400 high in 370 of room: line up its top, 900 - 16 = 884.
    expect(scrollToShowField({ ...base, fieldY: 900, fieldHeight: 400 })).toBe(884);
  });

  it("with no keyboard the whole viewport counts", () => {
    // 600 + 56 + 16 = 672 inside 700.
    expect(scrollToShowField({ ...base, inset: 0, fieldY: 600 })).toBeNull();
  });
});

describe("useKeyboardInset", () => {
  it("is the keyboard's height while open and 0 once it closes", async () => {
    const listeners = new Map<string, (e: KeyboardEvent) => void>();
    jest.spyOn(Keyboard, "addListener").mockImplementation((name, fn) => {
      listeners.set(name, fn as (e: KeyboardEvent) => void);
      return { remove: jest.fn() } as never;
    });
    const { result } = await renderHook(() => useKeyboardInset());
    expect(result.current).toBe(0);
    const show = listeners.get("keyboardWillShow") ?? listeners.get("keyboardDidShow");
    const hide = listeners.get("keyboardWillHide") ?? listeners.get("keyboardDidHide");
    await act(async () =>
      show?.({ endCoordinates: { height: 336, screenX: 0, screenY: 500, width: 400 } } as never),
    );
    expect(result.current).toBe(336);
    await act(async () => hide?.({} as never));
    expect(result.current).toBe(0);
  });
});
