import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAppUrl } from "./url";

describe("getAppUrl", () => {
  const originalWindow = globalThis.window;
  const originalProcess = (globalThis as any).process;

  beforeEach(() => {
    (globalThis as any).window = {
      location: {
        hostname: "localhost",
      },
    };
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    (globalThis as any).process = originalProcess;
  });

  it("returns http://localhost:5173 when on localhost in the browser", () => {
    (globalThis as any).window.location.hostname = "localhost";
    expect(getAppUrl()).toBe("http://localhost:5173");
  });

  it("returns http://localhost:5173 when on 127.0.0.1 in the browser", () => {
    (globalThis as any).window.location.hostname = "127.0.0.1";
    expect(getAppUrl()).toBe("http://localhost:5173");
  });

  it("returns Railway web URL when on railway.app in the browser", () => {
    (globalThis as any).window.location.hostname = "marketing-production-d21f.up.railway.app";
    expect(getAppUrl()).toBe("https://web-production-845e6c.up.railway.app");
  });

  it("returns https://app.flump.co.uk when on flump.co.uk in the browser", () => {
    (globalThis as any).window.location.hostname = "flump.co.uk";
    expect(getAppUrl()).toBe("https://app.flump.co.uk");
  });

  it("respects window.__FLUMP_APP_URL__ if injected", () => {
    (globalThis as any).window.__FLUMP_APP_URL__ = "https://custom-app.flump.co.uk";
    expect(getAppUrl()).toBe("https://custom-app.flump.co.uk");
  });
});
