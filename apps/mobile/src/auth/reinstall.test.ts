import { DEVICE_LOCK_KEY, THEME_KEY } from "../device/storageKeys";
import { deviceKeys } from "./deviceKeys";
import { INSTALL_MARKER_KEY, type PreferencesLike, wipeAfterReinstall } from "./reinstall";

function preferences(initial: Record<string, unknown> = {}) {
  const values = { ...initial };
  const prefs: PreferencesLike & { values: Record<string, unknown> } = {
    get: jest.fn((key: string) => values[key]),
    set: jest.fn((next: Record<string, unknown>) => Object.assign(values, next)),
    values,
  };
  return prefs;
}

describe("wipeAfterReinstall", () => {
  it("first launch of an installation (no marker): clears the store, then sets the marker", async () => {
    const prefs = preferences();
    const order: string[] = [];
    const tokens = {
      clear: jest.fn(async () => {
        order.push(`clear, marker ${String(prefs.values[INSTALL_MARKER_KEY])}`);
        return true;
      }),
    };
    await wipeAfterReinstall(prefs, tokens);
    expect(order).toEqual(["clear, marker undefined"]);
    expect(prefs.values[INSTALL_MARKER_KEY]).toBe(true);
  });

  it("a later launch (marker set) clears nothing", async () => {
    const tokens = { clear: jest.fn(async () => true) };
    await wipeAfterReinstall(preferences({ [INSTALL_MARKER_KEY]: true }), tokens);
    expect(tokens.clear).not.toHaveBeenCalled();
  });

  it.each([
    ["a string", "true"],
    ["a number", 1],
  ])("a marker that is %s is not trusted: the store is cleared", async (_name, value) => {
    const tokens = { clear: jest.fn(async () => true) };
    await wipeAfterReinstall(preferences({ [INSTALL_MARKER_KEY]: value }), tokens);
    expect(tokens.clear).toHaveBeenCalledTimes(1);
  });

  it("a failed clear leaves the marker unset, so the next launch tries again", async () => {
    const prefs = preferences();
    const tokens = { clear: jest.fn(async () => false) };
    await wipeAfterReinstall(prefs, tokens);
    expect(prefs.set).not.toHaveBeenCalled();
    tokens.clear.mockResolvedValue(true);
    await wipeAfterReinstall(prefs, tokens);
    expect(tokens.clear).toHaveBeenCalledTimes(2);
    expect(prefs.values[INSTALL_MARKER_KEY]).toBe(true);
  });

  it("unreadable preferences change nothing and do not throw", async () => {
    const tokens = { clear: jest.fn(async () => true) };
    const broken: PreferencesLike = {
      get: () => {
        throw new Error("no preferences");
      },
      set: jest.fn(),
    };
    await expect(wipeAfterReinstall(broken, tokens)).resolves.toBeUndefined();
    expect(tokens.clear).not.toHaveBeenCalled();
  });
});

describe("the device keys after a reinstall (E12 S9)", () => {
  it("the first launch clears the theme and the app lock flag too, then sets the marker", async () => {
    const prefs = preferences();
    const tokens = { clear: jest.fn(async () => true) };
    const store = {
      getItemAsync: jest.fn(async () => null),
      setItemAsync: jest.fn(async () => {}),
      deleteItemAsync: jest.fn(async () => {}),
    };
    await wipeAfterReinstall(prefs, tokens, deviceKeys(store, 7));
    expect(store.deleteItemAsync.mock.calls).toEqual([
      [THEME_KEY, { keychainAccessible: 7 }],
      [DEVICE_LOCK_KEY, { keychainAccessible: 7 }],
    ]);
    expect(prefs.values[INSTALL_MARKER_KEY]).toBe(true);
  });

  it("a key that will not go leaves the marker unset, so the next launch tries again", async () => {
    const prefs = preferences();
    const tokens = { clear: jest.fn(async () => true) };
    const store = {
      getItemAsync: jest.fn(async () => null),
      setItemAsync: jest.fn(async () => {}),
      deleteItemAsync: jest.fn(async (key: string) => {
        if (key === DEVICE_LOCK_KEY) throw new Error("busy");
      }),
    };
    await wipeAfterReinstall(prefs, tokens, deviceKeys(store, 7));
    // The theme still went; only the marker waits.
    expect(store.deleteItemAsync).toHaveBeenCalledWith(THEME_KEY, { keychainAccessible: 7 });
    expect(prefs.set).not.toHaveBeenCalled();
  });

  it("a later launch clears no device key", async () => {
    const store = {
      getItemAsync: jest.fn(async () => null),
      setItemAsync: jest.fn(async () => {}),
      deleteItemAsync: jest.fn(async () => {}),
    };
    const tokens = { clear: jest.fn(async () => true) };
    await wipeAfterReinstall(
      preferences({ [INSTALL_MARKER_KEY]: true }),
      tokens,
      deviceKeys(store, 7),
    );
    expect(store.deleteItemAsync).not.toHaveBeenCalled();
  });
});
