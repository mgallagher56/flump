import { createBrowserActivity, createDeviceHousekeeping } from "./deviceHousekeeping";

function deps() {
  const order: string[] = [];
  return {
    order,
    sweepExports: jest.fn(async () => {
      order.push("sweep");
    }),
    clearLock: jest.fn(async () => {
      order.push("lock");
    }),
    reinstallWipe: jest.fn(async () => {
      order.push("reinstall");
    }),
  };
}

describe("the HTTP cache sweep (E12 S7)", () => {
  function withHttp() {
    const d = deps();
    return {
      ...d,
      sweepHttpCache: jest.fn(async () => {
        d.order.push("http");
      }),
    };
  }

  it("runs on every launch, after the export sweep", async () => {
    const d = withHttp();
    await createDeviceHousekeeping(d).onLaunch();
    expect(d.order).toEqual(["reinstall", "sweep", "http"]);
  });

  it("runs with every wipe (sign-out, session end, deletion)", async () => {
    const d = withHttp();
    await createDeviceHousekeeping(d).wipe();
    expect(d.order).toEqual(["lock", "sweep", "http"]);
  });

  it("a sweep that fails stops nothing", async () => {
    const d = withHttp();
    d.sweepHttpCache.mockRejectedValueOnce(new Error("busy"));
    await expect(createDeviceHousekeeping(d).wipe()).resolves.toBeUndefined();
  });
});

describe("device housekeeping (E12 S9)", () => {
  it("on launch: the reinstall wipe, then the export folder is swept", async () => {
    const d = deps();
    await createDeviceHousekeeping(d).onLaunch();
    expect(d.order).toEqual(["reinstall", "sweep"]);
    // Launch never touches the lock flag: a cold start must find it to lock.
    expect(d.clearLock).not.toHaveBeenCalled();
  });

  it("on launch without a reinstall wipe (Android) the sweep still runs", async () => {
    const d = deps();
    await createDeviceHousekeeping({ ...d, reinstallWipe: undefined }).onLaunch();
    expect(d.order).toEqual(["sweep"]);
  });

  it("the wipe (sign-out, session end, deletion) clears the lock flag and sweeps the exports", async () => {
    const d = deps();
    await createDeviceHousekeeping(d).wipe();
    expect(d.order).toEqual(["lock", "sweep"]);
    expect(d.reinstallWipe).not.toHaveBeenCalled();
  });

  it("one failing step does not stop the next, and nothing throws", async () => {
    const d = deps();
    d.clearLock.mockRejectedValueOnce(new Error("store"));
    d.reinstallWipe.mockRejectedValueOnce(new Error("prefs"));
    const housekeeping = createDeviceHousekeeping(d);
    await expect(housekeeping.wipe()).resolves.toBeUndefined();
    await expect(housekeeping.onLaunch()).resolves.toBeUndefined();
    expect(d.sweepExports).toHaveBeenCalledTimes(2);
  });
});

describe("the browser activity", () => {
  it("is open only while a tracked browser is open, nested calls included", async () => {
    const activity = createBrowserActivity();
    expect(activity.isOpen()).toBe(false);
    let finishFirst: (v: string) => void = () => {};
    const first = activity.track(() => new Promise<string>((r) => (finishFirst = r)));
    const second = activity.track(async () => "second");
    expect(activity.isOpen()).toBe(true);
    expect(await second).toBe("second");
    expect(activity.isOpen()).toBe(true);
    finishFirst("first");
    expect(await first).toBe("first");
    expect(activity.isOpen()).toBe(false);
  });

  it("closes when the browser throws", async () => {
    const activity = createBrowserActivity();
    await expect(
      activity.track(async () => {
        throw new Error("no browser");
      }),
    ).rejects.toThrow("no browser");
    expect(activity.isOpen()).toBe(false);
  });
});
