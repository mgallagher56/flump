/**
 * Whether a screen has shown online at least once (E12 S7 follow-up): a page opened offline says it
 * is offline, but one already open when the connection drops stays, with what was typed.
 */
import { renderHook } from "@testing-library/react-native";
import { useShownOnline } from "./useShownOnline";

describe("useShownOnline", () => {
  it("is false for a screen opened offline", async () => {
    const { result } = await renderHook(() => useShownOnline(true));
    expect(result.current).toBe(false);
  });

  it("is true online, and stays true once the connection drops", async () => {
    const { result, rerender } = await renderHook(
      ({ offline }: { offline: boolean }) => useShownOnline(offline),
      {
        initialProps: { offline: false },
      },
    );
    expect(result.current).toBe(true);
    await rerender({ offline: true });
    expect(result.current).toBe(true);
  });

  it("turns true once a screen opened offline comes online", async () => {
    const { result, rerender } = await renderHook(
      ({ offline }: { offline: boolean }) => useShownOnline(offline),
      {
        initialProps: { offline: true },
      },
    );
    await rerender({ offline: false });
    await rerender({ offline: true });
    expect(result.current).toBe(true);
  });
});
