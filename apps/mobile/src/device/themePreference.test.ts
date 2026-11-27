import { createTokenStore, REFRESH_TOKEN_KEY } from "../auth/tokenStore";
import { THEME_KEY } from "./storageKeys";
import {
  createThemePreferenceStore,
  nextThemePreference,
  type SyncSecureStoreLike,
  THEME_CYCLE,
} from "./themePreference";

const ACCESSIBLE = 7; // Stands in for expo-secure-store's WHEN_UNLOCKED_THIS_DEVICE_ONLY.

/** expo-secure-store in memory, recording the options each call was given. */
function memoryStore(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  const options: unknown[] = [];
  const store: SyncSecureStoreLike & {
    getItemAsync(k: string, o: unknown): Promise<string | null>;
  } = {
    getItem: jest.fn((key: string, o: unknown) => {
      options.push(o);
      return items.get(key) ?? null;
    }),
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: jest.fn(async (key: string, value: string, o: unknown) => {
      options.push(o);
      items.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string, o: unknown) => {
      options.push(o);
      items.delete(key);
    }),
  };
  return { store, items, options };
}

describe("the stored theme choice", () => {
  it.each([
    [undefined, "system"],
    ["light", "light"],
    ["dark", "dark"],
    ["purple", "system"],
    ["", "system"],
  ])("reads %p as %s, at once (no await), so the first frame is right", (stored, expected) => {
    const { store } = memoryStore(stored === undefined ? {} : { [THEME_KEY]: stored });
    expect(createThemePreferenceStore(store, ACCESSIBLE).read()).toBe(expected);
    expect(store.getItem).toHaveBeenCalledWith(THEME_KEY, { keychainAccessible: ACCESSIBLE });
  });

  it("reads System when the store cannot be read (a locked iPhone)", () => {
    const { store } = memoryStore();
    (store.getItem as jest.Mock).mockImplementation(() => {
      throw new Error("locked");
    });
    expect(createThemePreferenceStore(store, ACCESSIBLE).read()).toBe("system");
  });

  it("writes light and dark under the key, and System as no value, with the token's option", async () => {
    const { store, items, options } = memoryStore();
    const themes = createThemePreferenceStore(store, ACCESSIBLE);
    await themes.write("dark");
    expect(items.get(THEME_KEY)).toBe("dark");
    await themes.write("light");
    expect(items.get(THEME_KEY)).toBe("light");
    await themes.write("system");
    expect(items.has(THEME_KEY)).toBe(false);
    expect(new Set(options.map((o) => JSON.stringify(o)))).toEqual(
      new Set([JSON.stringify({ keychainAccessible: ACCESSIBLE })]),
    );
  });

  it("a failed write is swallowed: the choice still applies while the app is open", async () => {
    const { store } = memoryStore();
    (store.setItemAsync as jest.Mock).mockRejectedValue(new Error("full"));
    await expect(createThemePreferenceStore(store, ACCESSIBLE).write("dark")).resolves.toBe(
      undefined,
    );
  });

  it("is kept through sign-out: clearing the refresh token leaves the theme", async () => {
    const { store, items } = memoryStore({ [THEME_KEY]: "dark", [REFRESH_TOKEN_KEY]: "rt" });
    // Sign-out clears the token store (session.ts); the theme lives under its own key.
    await createTokenStore(store, ACCESSIBLE).clear();
    expect(items.has(REFRESH_TOKEN_KEY)).toBe(false);
    expect(createThemePreferenceStore(store, ACCESSIBLE).read()).toBe("dark");
  });
});

describe("the header's cycle", () => {
  it("goes System, Light, Dark, then System again, as web's ThemeToggle", () => {
    expect(THEME_CYCLE).toEqual(["system", "light", "dark"]);
    expect(nextThemePreference("system")).toBe("light");
    expect(nextThemePreference("light")).toBe("dark");
    expect(nextThemePreference("dark")).toBe("system");
  });
});
