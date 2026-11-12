import { describe, expect, it } from "vitest";
import { loadApiConfig } from "./config.server";

describe("loadApiConfig", () => {
  it("defaults to the backend dev port when VITE_API_URL is unset in development", () => {
    expect(loadApiConfig({ NODE_ENV: "development" })).toEqual({
      apiBaseUrl: "http://localhost:4000",
    });
  });

  it("defaults to the backend dev port when VITE_API_URL is blank and NODE_ENV is unset", () => {
    expect(loadApiConfig({ VITE_API_URL: "   " })).toEqual({
      apiBaseUrl: "http://localhost:4000",
    });
  });

  it("strips trailing slashes", () => {
    expect(loadApiConfig({ VITE_API_URL: "https://api.example.test/" })).toEqual({
      apiBaseUrl: "https://api.example.test",
    });
    expect(loadApiConfig({ VITE_API_URL: "https://api.example.test///" }).apiBaseUrl).toBe(
      "https://api.example.test",
    );
  });

  it("trims whitespace around the value", () => {
    expect(loadApiConfig({ VITE_API_URL: "  http://localhost:4000  " }).apiBaseUrl).toBe(
      "http://localhost:4000",
    );
  });

  it("throws in production when VITE_API_URL is unset or blank", () => {
    expect(() => loadApiConfig({ NODE_ENV: "production" })).toThrow(
      /VITE_API_URL must be set in production/,
    );
    expect(() => loadApiConfig({ NODE_ENV: "production", VITE_API_URL: " " })).toThrow(
      /VITE_API_URL must be set in production/,
    );
  });

  it("accepts a valid URL in production", () => {
    expect(
      loadApiConfig({ NODE_ENV: "production", VITE_API_URL: "https://api.example.test" })
        .apiBaseUrl,
    ).toBe("https://api.example.test");
  });

  it("throws for a value that is not a URL", () => {
    expect(() => loadApiConfig({ VITE_API_URL: "not a url" })).toThrow(/VITE_API_URL/);
  });

  it("throws for a non-http(s) protocol", () => {
    expect(() => loadApiConfig({ VITE_API_URL: "ftp://x" })).toThrow(/VITE_API_URL/);
  });
});
