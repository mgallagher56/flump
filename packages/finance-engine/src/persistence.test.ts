import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BrowserCookieSeedAdapter,
  BrowserStorageDriver,
  clearOnboardingSeed,
  getStorageDriver,
  hasSessionPresenceCookie,
  InMemoryProfileAdapter,
  InMemoryStorageDriver,
  ONBOARDING_SEED_MAX_AGE_SECONDS,
  ONBOARDING_SEED_STORAGE_KEY,
  parseCookieValue,
  persistOnboardingSeed,
  readAndClearOnboardingSeed,
  readOnboardingSeed,
  readOnboardingSeedFromHeader,
  SESSION_PRESENCE_COOKIE,
  setSessionPresenceCookie,
  setStorageDriver,
} from "./persistence.js";
import { decodeSeedPayload, encodeSeedPayload } from "./profile.js";
import type { FinancialBaseline, OnboardingSeedPayload } from "./types.js";

describe("Profile Persistence", () => {
  it("operates in pure in-memory mode via InMemoryStorageDriver without browser globals", () => {
    const memoryDriver = new InMemoryStorageDriver();
    setStorageDriver(memoryDriver);

    try {
      const testSeed = { salary: 65000, age: 30 };
      persistOnboardingSeed(testSeed);

      const read = readOnboardingSeed();
      expect(read).toMatchObject(testSeed);

      clearOnboardingSeed();
      expect(readOnboardingSeed()).toBeNull();
    } finally {
      setStorageDriver(null);
    }
  });

  it("parseCookieValue extracts named cookie", () => {
    const header = "foo=bar; flump_onboarding_seed=hello123; other=xyz";
    expect(parseCookieValue(header, "flump_onboarding_seed")).toBe("hello123");
    expect(parseCookieValue(header, "not_found")).toBeNull();
    expect(parseCookieValue(null, "foo")).toBeNull();
    expect(parseCookieValue(undefined, "foo")).toBeNull();
  });

  describe("window / document storage and cookies", () => {
    let mockCookies = "";
    const mockStorage: Record<string, string> = {};

    beforeEach(() => {
      setStorageDriver(new BrowserStorageDriver());
      mockCookies = "";
      for (const key of Object.keys(mockStorage)) {
        delete mockStorage[key];
      }
      (globalThis as any).window = {
        location: { hostname: "app.example.test" },
        localStorage: {
          getItem: (key: string) => mockStorage[key] ?? null,
          setItem: (key: string, val: string) => {
            mockStorage[key] = val;
          },
          removeItem: (key: string) => {
            delete mockStorage[key];
          },
        },
      };
      (globalThis as any).document = {
        get cookie() {
          return mockCookies;
        },
        set cookie(val: string) {
          const [pair] = val.split(";");
          const eqIdx = pair.indexOf("=");
          const k = eqIdx > -1 ? pair.slice(0, eqIdx) : pair;
          const v = eqIdx > -1 ? pair.slice(eqIdx + 1) : "";

          if (val.includes("max-age=0") || val.includes("Max-Age=0")) {
            mockCookies = mockCookies
              .split("; ")
              .filter((c) => Boolean(c) && !c.startsWith(`${k}=`))
              .join("; ");
          } else {
            const existing = mockCookies
              ? mockCookies.split("; ").filter((c) => Boolean(c) && !c.startsWith(`${k}=`))
              : [];
            existing.push(`${k}=${v}`);
            mockCookies = existing.join("; ");
          }
        },
      };
    });

    afterEach(() => {
      setStorageDriver(null);
      delete (globalThis as any).window;
      delete (globalThis as any).document;
    });

    const samplePayload: OnboardingSeedPayload = {
      salary: 50000,
      stage: "STAGE_2_BUFFER_BUILD",
    };

    it("persists and reads onboarding seed from cookies and localStorage", () => {
      persistOnboardingSeed(samplePayload);
      expect(mockCookies).toContain(ONBOARDING_SEED_STORAGE_KEY);
      expect(mockStorage[ONBOARDING_SEED_STORAGE_KEY]).toBeDefined();

      const read = readOnboardingSeed();
      expect(read).toEqual(samplePayload);
    });

    it("writes the seed cookie for one hour and adds Secure only on https", () => {
      const writes: string[] = [];
      const doc = (globalThis as any).document;
      const original = Object.getOwnPropertyDescriptor(doc, "cookie") as PropertyDescriptor;
      Object.defineProperty(doc, "cookie", {
        configurable: true,
        get: original.get,
        set(val: string) {
          writes.push(val);
          original.set?.call(doc, val);
        },
      });

      expect(ONBOARDING_SEED_MAX_AGE_SECONDS).toBe(3600);
      persistOnboardingSeed(samplePayload);
      expect(writes[0]).toContain("max-age=3600");
      expect(writes[0]).not.toContain("; Secure");

      (globalThis as any).window.location.protocol = "https:";
      persistOnboardingSeed(samplePayload);
      expect(writes[1]).toContain("; Secure");
      clearOnboardingSeed();
      expect(writes[writes.length - 1]).toContain("max-age=0");
    });

    it("falls back to localStorage if cookie is empty", () => {
      persistOnboardingSeed(samplePayload);
      mockCookies = ""; // Clear cookie only
      const read = readOnboardingSeed();
      expect(read).toEqual(samplePayload);
    });

    it("clears and reads and clears onboarding seed", () => {
      persistOnboardingSeed(samplePayload);
      const readAndCleared = readAndClearOnboardingSeed();
      expect(readAndCleared).toEqual(samplePayload);
      expect(readOnboardingSeed()).toBeNull();
    });

    it("handles session presence cookie setting and reading", () => {
      expect(hasSessionPresenceCookie()).toBe(false);
      setSessionPresenceCookie(true);
      expect(hasSessionPresenceCookie()).toBe(true);
      expect(hasSessionPresenceCookie("other=1; flump_has_session=1")).toBe(true);
      expect(hasSessionPresenceCookie("other=1; flump_has_session=0")).toBe(false);

      setSessionPresenceCookie(false);
      expect(hasSessionPresenceCookie()).toBe(false);
    });

    it("reads onboarding seed from request header", () => {
      persistOnboardingSeed(samplePayload);
      const rawCookie = mockCookies;
      expect(readOnboardingSeedFromHeader(rawCookie)).toEqual(samplePayload);
      expect(readOnboardingSeedFromHeader(null)).toBeNull();
      expect(readOnboardingSeedFromHeader("")).toBeNull();
      expect(readOnboardingSeedFromHeader("foo=bar")).toBeNull();
    });

    it("BrowserCookieSeedAdapter delegates seed operations", () => {
      const adapter = new BrowserCookieSeedAdapter();
      adapter.saveSeed(samplePayload);
      expect(adapter.getSeed()).toEqual(samplePayload);
      adapter.clearSeed();
      expect(adapter.getSeed()).toBeNull();
    });
  });

  it("BrowserCookieSeedAdapter implements ProfilePersistenceAdapter", () => {
    const adapter = new BrowserCookieSeedAdapter();
    const testBaseline: FinancialBaseline = {
      userId: "u123",
      taxYear: "2025/26",
      ukRegion: "ENGLAND_NI_WALES",
      employmentStatus: "PAYE",
      annualGrossSalary: 60000,
      annualBonusOrSideIncome: 0,
      pensionContributionPct: 5,
      employerPensionMatchPct: 3,
      isSalarySacrifice: true,
      studentLoanPlan: "NONE",
      propertyOwnershipSharePct: 100,
      financialStage: "STAGE_2_BUFFER_BUILD",
      enabledModules: ["accounts", "budget"],
    };

    adapter.saveBaseline(testBaseline);
    expect(adapter.getBaseline()).toEqual(testBaseline);
  });

  it("InMemoryProfileAdapter round-trips baseline and seed", () => {
    const adapter = new InMemoryProfileAdapter();
    const seed: OnboardingSeedPayload = {
      salary: 50000,
      stage: "STAGE_2_BUFFER_BUILD",
    };

    adapter.saveSeed(seed);
    expect(adapter.getSeed()).toEqual(seed);
    adapter.clearSeed();
    expect(adapter.getSeed()).toBeNull();
  });
});

describe("storage keys", () => {
  it("names the seed key and the session presence cookie that the web app and backend read", () => {
    expect(ONBOARDING_SEED_STORAGE_KEY).toBe("flump_onboarding_seed");
    expect(SESSION_PRESENCE_COOKIE).toBe("flump_has_session");
  });
});

describe("InMemoryStorageDriver", () => {
  it("stores, reads and removes items and cookies separately", () => {
    const driver = new InMemoryStorageDriver();
    expect(driver.getItem("k")).toBeNull();
    expect(driver.getCookie("k")).toBeNull();

    driver.setItem("k", "item");
    driver.setCookie("k", "cookie");
    expect(driver.getItem("k")).toBe("item");
    expect(driver.getCookie("k")).toBe("cookie");

    driver.removeItem("k");
    expect(driver.getItem("k")).toBeNull();
    expect(driver.getCookie("k")).toBe("cookie");
    driver.removeCookie("k");
    expect(driver.getCookie("k")).toBeNull();
  });

  it("clear empties both items and cookies", () => {
    const driver = new InMemoryStorageDriver();
    driver.setItem("a", "1");
    driver.setCookie("b", "2");
    driver.clear();
    expect(driver.getItem("a")).toBeNull();
    expect(driver.getCookie("b")).toBeNull();
  });
});

describe("BrowserStorageDriver cookies", () => {
  let writes: string[] = [];

  beforeEach(() => {
    writes = [];
    (globalThis as unknown as Record<string, unknown>).document = {
      get cookie() {
        return "";
      },
      set cookie(val: string) {
        writes.push(val);
      },
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as Record<string, unknown>).window;
    delete (globalThis as unknown as Record<string, unknown>).document;
  });

  it("writes a host-only, lax, path-wide cookie with the value URL-encoded", () => {
    new BrowserStorageDriver().setCookie("seed", "a b", 60);
    expect(writes).toEqual(["seed=a%20b; path=/; max-age=60; SameSite=Lax"]);
  });

  it("adds the domain attribute only when a domain is given", () => {
    const driver = new BrowserStorageDriver();
    driver.setCookie("seed", "v", 60, "example.test");
    driver.removeCookie("seed", "example.test");
    expect(writes).toEqual([
      "seed=v; path=/; max-age=60; SameSite=Lax; domain=example.test",
      "seed=; path=/; max-age=0; SameSite=Lax; domain=example.test",
    ]);
  });

  it("removes a cookie by expiring it now", () => {
    new BrowserStorageDriver().removeCookie("seed");
    expect(writes).toEqual(["seed=; path=/; max-age=0; SameSite=Lax"]);
  });

  it("adds Secure on https pages and leaves it off on http", () => {
    const driver = new BrowserStorageDriver();
    (globalThis as unknown as Record<string, unknown>).window = { location: { protocol: "http:" } };
    driver.setCookie("seed", "v", 60);
    (globalThis as unknown as Record<string, unknown>).window = {
      location: { protocol: "https:" },
    };
    driver.setCookie("seed", "v", 60);
    expect(writes).toEqual([
      "seed=v; path=/; max-age=60; SameSite=Lax",
      "seed=v; path=/; max-age=60; SameSite=Lax; Secure",
    ]);
  });

  it("leaves Secure off when the page location cannot be read", () => {
    (globalThis as unknown as Record<string, unknown>).window = {
      get location() {
        throw new Error("blocked");
      },
    };
    new BrowserStorageDriver().setCookie("seed", "v", 60);
    expect(writes).toEqual(["seed=v; path=/; max-age=60; SameSite=Lax"]);
  });

  it("reads no cookie, without throwing, where there is no document", () => {
    delete (globalThis as unknown as Record<string, unknown>).document;
    expect(new BrowserStorageDriver().getCookie("seed")).toBeNull();
  });
});

describe("storage driver selection", () => {
  afterEach(() => {
    setStorageDriver(null);
    delete (globalThis as unknown as Record<string, unknown>).window;
    delete (globalThis as unknown as Record<string, unknown>).document;
  });

  it("uses the in-memory driver where there is no window and no document", () => {
    setStorageDriver(null);
    expect(getStorageDriver()).toBeInstanceOf(InMemoryStorageDriver);
  });

  it("uses the browser driver when only a window exists", () => {
    (globalThis as unknown as Record<string, unknown>).window = {};
    expect(getStorageDriver()).toBeInstanceOf(BrowserStorageDriver);
  });

  it("uses the browser driver when only a document exists", () => {
    (globalThis as unknown as Record<string, unknown>).document = { cookie: "" };
    expect(getStorageDriver()).toBeInstanceOf(BrowserStorageDriver);
  });

  it("writes the seed through a driver that was set", () => {
    const driver = new InMemoryStorageDriver();
    setStorageDriver(driver);
    expect(getStorageDriver()).toBe(driver);
    persistOnboardingSeed({ salary: 40000 });
    expect(driver.getItem(ONBOARDING_SEED_STORAGE_KEY)).not.toBeNull();
    expect(driver.getCookie(ONBOARDING_SEED_STORAGE_KEY)).not.toBeNull();
  });
});

describe("readOnboardingSeed sources", () => {
  let driver: InMemoryStorageDriver;

  beforeEach(() => {
    driver = new InMemoryStorageDriver();
    setStorageDriver(driver);
  });

  afterEach(() => {
    setStorageDriver(null);
  });

  it("prefers the cookie seed over the localStorage seed", () => {
    driver.setCookie(ONBOARDING_SEED_STORAGE_KEY, encodeSeedPayload({ salary: 1 }));
    driver.setItem(ONBOARDING_SEED_STORAGE_KEY, encodeSeedPayload({ salary: 2 }));
    expect(readOnboardingSeed()).toEqual({ salary: 1 });
  });

  it("falls back to localStorage when the cookie cannot be decoded", () => {
    expect(decodeSeedPayload("not-a-seed")).toBeNull();
    driver.setCookie(ONBOARDING_SEED_STORAGE_KEY, "not-a-seed");
    driver.setItem(ONBOARDING_SEED_STORAGE_KEY, encodeSeedPayload({ salary: 2 }));
    expect(readOnboardingSeed()).toEqual({ salary: 2 });
  });

  it("reads the localStorage seed when there is no cookie", () => {
    driver.setItem(ONBOARDING_SEED_STORAGE_KEY, encodeSeedPayload({ salary: 3 }));
    expect(readOnboardingSeed()).toEqual({ salary: 3 });
  });
});

describe("readOnboardingSeedFromHeader", () => {
  it("returns null, without throwing, for a seed cookie with broken percent-encoding", () => {
    expect(readOnboardingSeedFromHeader(`${ONBOARDING_SEED_STORAGE_KEY}=%E0%A4%A`)).toBeNull();
  });
});

describe("BrowserStorageDriver localStorage", () => {
  afterEach(() => {
    delete (globalThis as unknown as Record<string, unknown>).window;
  });

  it("reads null when localStorage throws, as in some private browsing modes", () => {
    (globalThis as unknown as Record<string, unknown>).window = {
      localStorage: {
        getItem: () => {
          throw new Error("SecurityError");
        },
      },
    };
    expect(new BrowserStorageDriver().getItem("k")).toBeNull();
  });
});
