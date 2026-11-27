import { DEVICE_LOCK_KEY } from "../device/storageKeys";
import { type AppLockDeps, type Authenticator, createAppLock, LOCK_AFTER_MS } from "./deviceLock";
import type { SecureStoreLike } from "./tokenStore";

// expo-local-authentication's SecurityLevel: NONE 0, SECRET 1 (passcode only), BIOMETRIC_STRONG 3.
const NONE = 0;
const SECRET = 1;
const BIOMETRIC_STRONG = 3;

function memoryStore(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const store: SecureStoreLike & { values: Map<string, string> } = {
    getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      values.delete(key);
    }),
    values,
  };
  return store;
}

function harness(over: { flag?: string; level?: number; succeed?: boolean } = {}) {
  let clock = 1_000_000;
  let level = over.level ?? BIOMETRIC_STRONG;
  let succeed = over.succeed ?? true;
  let exempt = false;
  const store = memoryStore(over.flag ? { [DEVICE_LOCK_KEY]: over.flag } : {});
  const auth: Authenticator & { authenticateAsync: jest.Mock } = {
    getEnrolledLevelAsync: jest.fn(async () => level),
    authenticateAsync: jest.fn(async () => ({ success: succeed })),
  };
  const screenCapture = {
    prevent: jest.fn(async () => {}),
    allow: jest.fn(async () => {}),
  };
  const deps: AppLockDeps = {
    auth,
    store,
    screenCapture,
    accessible: 7,
    now: () => clock,
    isExempt: () => exempt,
    prompts: { unlock: "Unlock Flump", turnOn: "Turn on", turnOff: "Turn off" },
  };
  const lock = createAppLock(deps);
  return {
    lock,
    auth,
    store,
    screenCapture,
    advance: (ms: number) => {
      clock += ms;
    },
    setLevel: (next: number) => {
      level = next;
    },
    setSucceed: (next: boolean) => {
      succeed = next;
    },
    setExempt: (next: boolean) => {
      exempt = next;
    },
  };
}

/** Away for `ms` in the background, then back. */
function awayFor(h: ReturnType<typeof harness>, ms: number) {
  h.lock.appStateChanged("background");
  h.advance(ms);
  h.lock.appStateChanged("active");
}

describe("app lock on a cold start", () => {
  it("is off when the flag is absent, and asks for nothing", async () => {
    const h = harness();
    expect(h.lock.getPhase()).toBe("checking");
    await h.lock.start();
    expect(h.lock.getPhase()).toBe("off");
    expect(h.auth.authenticateAsync).not.toHaveBeenCalled();
  });

  it("locks when the flag is on", async () => {
    const h = harness({ flag: "on" });
    await h.lock.start();
    expect(h.lock.getPhase()).toBe("locked");
    // Only Unlock asks the phone; starting never does.
    expect(h.auth.authenticateAsync).not.toHaveBeenCalled();
  });

  it.each(["", "true", "ON"])("only the exact value on counts: %j is off", async (flag) => {
    const h = harness({ flag });
    await h.lock.start();
    expect(h.lock.getPhase()).toBe("off");
  });

  it("fails closed when the flag cannot be read", async () => {
    const h = harness();
    (h.store.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error("locked keychain"));
    await h.lock.start();
    expect(h.lock.getPhase()).toBe("locked");
  });

  it("with the flag on and the phone's screen lock removed, offers only sign-out", async () => {
    const h = harness({ flag: "on", level: NONE });
    await h.lock.start();
    expect(h.lock.getPhase()).toBe("noScreenLock");
  });
});

describe("unlock", () => {
  it("a successful prompt unlocks", async () => {
    const h = harness({ flag: "on" });
    await h.lock.start();
    await h.lock.unlock();
    expect(h.lock.getPhase()).toBe("unlocked");
    expect(h.auth.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: "Unlock Flump", disableDeviceFallback: false }),
    );
  });

  it("a cancelled or failed prompt stays locked", async () => {
    const h = harness({ flag: "on", succeed: false });
    await h.lock.start();
    await h.lock.unlock();
    expect(h.lock.getPhase()).toBe("locked");
    h.auth.authenticateAsync.mockRejectedValueOnce(new Error("system cancel"));
    await h.lock.unlock();
    expect(h.lock.getPhase()).toBe("locked");
  });

  it("a passcode-only phone can still unlock", async () => {
    const h = harness({ flag: "on", level: SECRET });
    await h.lock.start();
    await h.lock.unlock();
    expect(h.lock.getPhase()).toBe("unlocked");
  });

  it("a screen lock removed while locked fails closed: no prompt, sign-out only", async () => {
    const h = harness({ flag: "on" });
    await h.lock.start();
    h.setLevel(NONE);
    await h.lock.unlock();
    expect(h.lock.getPhase()).toBe("noScreenLock");
    expect(h.auth.authenticateAsync).not.toHaveBeenCalled();
    // Unlock does nothing from there: only signing out leaves it.
    h.setLevel(BIOMETRIC_STRONG);
    await h.lock.unlock();
    expect(h.lock.getPhase()).toBe("noScreenLock");
  });

  it("a screen lock that cannot be checked stays locked", async () => {
    const h = harness({ flag: "on" });
    await h.lock.start();
    (h.auth.getEnrolledLevelAsync as jest.Mock).mockRejectedValueOnce(new Error("no module"));
    await h.lock.unlock();
    expect(h.lock.getPhase()).toBe("locked");
    expect(h.auth.authenticateAsync).not.toHaveBeenCalled();
  });
});

describe("the 60 second timer", () => {
  async function unlocked() {
    const h = harness({ flag: "on" });
    await h.lock.start();
    await h.lock.unlock();
    expect(h.lock.getPhase()).toBe("unlocked");
    return h;
  }

  it("back within 60 seconds: still unlocked", async () => {
    const h = await unlocked();
    awayFor(h, LOCK_AFTER_MS - 1);
    expect(h.lock.getPhase()).toBe("unlocked");
  });

  it("back after exactly 60 seconds, or more: locked", async () => {
    const h = await unlocked();
    awayFor(h, LOCK_AFTER_MS);
    expect(h.lock.getPhase()).toBe("locked");
    const h2 = await unlocked();
    awayFor(h2, LOCK_AFTER_MS + 1);
    expect(h2.lock.getPhase()).toBe("locked");
  });

  it("inactive alone (a notification, the app switcher) starts no timer", async () => {
    const h = await unlocked();
    h.lock.appStateChanged("inactive");
    h.advance(LOCK_AFTER_MS * 2);
    h.lock.appStateChanged("active");
    expect(h.lock.getPhase()).toBe("unlocked");
  });

  it("time spent in the sign-in browser never locks", async () => {
    const h = await unlocked();
    h.setExempt(true);
    awayFor(h, LOCK_AFTER_MS * 5);
    h.setExempt(false);
    expect(h.lock.getPhase()).toBe("unlocked");
  });

  it("time spent in the phone's own unlock prompt never locks", async () => {
    const h = await unlocked();
    h.auth.authenticateAsync.mockImplementationOnce(async () => {
      awayFor(h, LOCK_AFTER_MS * 2);
      return { success: true };
    });
    expect(await h.lock.turnOff()).toBe("off");
    expect(h.lock.getPhase()).toBe("off");
  });

  it("does nothing while the lock is off", async () => {
    const h = harness();
    await h.lock.start();
    awayFor(h, LOCK_AFTER_MS * 2);
    expect(h.lock.getPhase()).toBe("off");
  });

  it("each trip away is timed on its own", async () => {
    const h = await unlocked();
    awayFor(h, LOCK_AFTER_MS - 1);
    h.advance(LOCK_AFTER_MS);
    awayFor(h, 1);
    expect(h.lock.getPhase()).toBe("unlocked");
  });
});

describe("turning it on and off", () => {
  it("turning on asks the phone first, then stores the flag", async () => {
    const h = harness();
    await h.lock.start();
    h.auth.authenticateAsync.mockImplementationOnce(async () => {
      expect(h.store.values.get(DEVICE_LOCK_KEY)).toBeUndefined();
      return { success: true };
    });
    expect(await h.lock.turnOn()).toBe("on");
    expect(h.store.values.get(DEVICE_LOCK_KEY)).toBe("on");
    expect(h.store.setItemAsync).toHaveBeenCalledWith(DEVICE_LOCK_KEY, "on", {
      keychainAccessible: 7,
    });
    expect(h.lock.getPhase()).toBe("unlocked");
  });

  it("a cancelled confirmation leaves it off and stores nothing", async () => {
    const h = harness({ succeed: false });
    await h.lock.start();
    expect(await h.lock.turnOn()).toBe("cancelled");
    expect(h.store.values.has(DEVICE_LOCK_KEY)).toBe(false);
    expect(h.lock.getPhase()).toBe("off");
  });

  it("cannot be turned on without a screen lock, and asks nothing", async () => {
    const h = harness({ level: NONE });
    await h.lock.start();
    expect(await h.lock.availability()).toBe("noScreenLock");
    expect(await h.lock.turnOn()).toBe("noScreenLock");
    expect(h.auth.authenticateAsync).not.toHaveBeenCalled();
    expect(h.store.values.has(DEVICE_LOCK_KEY)).toBe(false);
  });

  it("availability is available with a passcode or biometrics", async () => {
    expect(await harness({ level: SECRET }).lock.availability()).toBe("available");
    expect(await harness({ level: BIOMETRIC_STRONG }).lock.availability()).toBe("available");
  });

  it("turning off asks first; cancelled keeps the flag", async () => {
    const h = harness({ flag: "on" });
    await h.lock.start();
    await h.lock.unlock();
    h.setSucceed(false);
    expect(await h.lock.turnOff()).toBe("cancelled");
    expect(h.store.values.get(DEVICE_LOCK_KEY)).toBe("on");
    h.setSucceed(true);
    expect(await h.lock.turnOff()).toBe("off");
    expect(h.store.values.has(DEVICE_LOCK_KEY)).toBe(false);
    expect(h.lock.getPhase()).toBe("off");
  });

  it("a store that refuses the flag leaves it off", async () => {
    const h = harness();
    await h.lock.start();
    (h.store.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error("full"));
    expect(await h.lock.turnOn()).toBe("failed");
    expect(h.lock.getPhase()).toBe("off");
  });
});

describe("clear (sign-out, session end, deletion)", () => {
  it("removes the flag and switches the lock off with no prompt", async () => {
    const h = harness({ flag: "on" });
    await h.lock.start();
    await h.lock.clear();
    expect(h.store.values.has(DEVICE_LOCK_KEY)).toBe(false);
    expect(h.lock.getPhase()).toBe("off");
    expect(h.auth.authenticateAsync).not.toHaveBeenCalled();
  });

  it("from the no-screen-lock dead end too", async () => {
    const h = harness({ flag: "on", level: NONE });
    await h.lock.start();
    await h.lock.clear();
    expect(h.lock.getPhase()).toBe("off");
    expect(h.store.values.has(DEVICE_LOCK_KEY)).toBe(false);
  });

  it("empties the flag when the delete fails, so it reads as off", async () => {
    const h = harness({ flag: "on" });
    (h.store.deleteItemAsync as jest.Mock).mockRejectedValueOnce(new Error("busy"));
    await h.lock.clear();
    // An emptied flag reads as off on the next start ("only the exact value on counts").
    expect(h.store.values.get(DEVICE_LOCK_KEY)).toBe("");
    expect(h.lock.getPhase()).toBe("off");
  });

  it("tells subscribers about each change", async () => {
    const h = harness({ flag: "on" });
    const seen: string[] = [];
    h.lock.subscribe((phase) => seen.push(phase));
    await h.lock.start();
    await h.lock.unlock();
    await h.lock.clear();
    expect(seen).toEqual(["locked", "unlocked", "off"]);
  });
});

describe("screenshots and the recents card (Android's FLAG_SECURE) follow the lock", () => {
  /** Which native calls were made, in order. */
  const calls = (h: ReturnType<typeof harness>) =>
    [
      ...h.screenCapture.prevent.mock.invocationCallOrder.map((n) => [n, "prevent"] as const),
      ...h.screenCapture.allow.mock.invocationCallOrder.map((n) => [n, "allow"] as const),
    ]
      .sort(([a], [b]) => a - b)
      .map(([, name]) => name);

  it("a cold start with the flag on blocks them before the phase leaves checking", async () => {
    const h = harness({ flag: "on" });
    const seenWhenLocked: number[] = [];
    h.lock.subscribe(() => seenWhenLocked.push(h.screenCapture.prevent.mock.calls.length));
    expect(calls(h)).toEqual([]);
    await h.lock.start();
    expect(h.lock.getPhase()).toBe("locked");
    expect(calls(h)).toEqual(["prevent"]);
    // Set before anyone hears of the new phase, so before the shell can show.
    expect(seenWhenLocked).toEqual([1]);
  });

  it.each([
    ["the flag cannot be read", { flag: "on" }, true],
    ["the phone has no screen lock left", { flag: "on", level: NONE }, false],
  ])("a cold start where %s blocks them too", async (_name, over, unreadable) => {
    const h = harness(over);
    if (unreadable) (h.store.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error("busy"));
    await h.lock.start();
    expect(calls(h)).toEqual(["prevent"]);
  });

  it("a cold start with the flag off touches nothing", async () => {
    const h = harness();
    await h.lock.start();
    expect(calls(h)).toEqual([]);
  });

  it("turning on blocks them once; locking and unlocking again changes nothing", async () => {
    const h = harness();
    await h.lock.start();
    await h.lock.turnOn();
    expect(calls(h)).toEqual(["prevent"]);
    awayFor(h, LOCK_AFTER_MS);
    expect(h.lock.getPhase()).toBe("locked");
    await h.lock.unlock();
    expect(h.lock.getPhase()).toBe("unlocked");
    expect(calls(h)).toEqual(["prevent"]);
  });

  it("a cancelled turn-on blocks nothing", async () => {
    const h = harness({ succeed: false });
    await h.lock.start();
    expect(await h.lock.turnOn()).toBe("cancelled");
    expect(calls(h)).toEqual([]);
  });

  it("turning off allows them again; a cancelled turn-off does not", async () => {
    const h = harness({ flag: "on" });
    await h.lock.start();
    await h.lock.unlock();
    h.setSucceed(false);
    await h.lock.turnOff();
    expect(calls(h)).toEqual(["prevent"]);
    h.setSucceed(true);
    await h.lock.turnOff();
    expect(calls(h)).toEqual(["prevent", "allow"]);
  });

  it.each([
    ["unlocked", true],
    ["locked", false],
  ])("clear (sign-out, session end, deletion) allows them again from %s", async (_p, unlock) => {
    const h = harness({ flag: "on" });
    await h.lock.start();
    if (unlock) await h.lock.unlock();
    await h.lock.clear();
    expect(calls(h)).toEqual(["prevent", "allow"]);
  });

  it("a native call that fails changes nothing about the lock", async () => {
    const h = harness();
    h.screenCapture.prevent.mockRejectedValueOnce(new Error("no window"));
    h.screenCapture.allow.mockRejectedValueOnce(new Error("no window"));
    await h.lock.start();
    expect(await h.lock.turnOn()).toBe("on");
    await h.lock.clear();
    expect(h.lock.getPhase()).toBe("off");
  });

  it("without the module (iOS, or an older build), the lock works the same", async () => {
    const store = memoryStore({ [DEVICE_LOCK_KEY]: "on" });
    const lock = createAppLock({
      auth: {
        getEnrolledLevelAsync: async () => 3,
        authenticateAsync: async () => ({ success: true }),
      },
      store,
      accessible: 7,
      now: () => 0,
      isExempt: () => false,
      prompts: { unlock: "u", turnOn: "on", turnOff: "off" },
    });
    await lock.start();
    await lock.unlock();
    await lock.clear();
    expect(lock.getPhase()).toBe("off");
  });
});
