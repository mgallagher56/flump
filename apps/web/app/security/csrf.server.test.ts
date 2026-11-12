// @vitest-environment node
// happy-dom's Request drops forbidden headers such as Sec-Fetch-Site; Node's keeps them.
import { describe, expect, it } from "vitest";
import { csrfRejection, expectedOrigin, isSameOriginRequest } from "./csrf.server";

const req = (
  method: string,
  headers: Record<string, string> = {},
  url = "https://app.flump.test/x",
) => new Request(url, { method, headers });

describe("expectedOrigin", () => {
  it("uses the request URL by default", () => {
    expect(expectedOrigin(req("GET"))).toBe("https://app.flump.test");
  });

  it("prefers forwarded proto and host", () => {
    const request = req(
      "GET",
      { "x-forwarded-proto": "https", "x-forwarded-host": "www.flump.test" },
      "http://internal:3000/x",
    );
    expect(expectedOrigin(request)).toBe("https://www.flump.test");
  });
});

describe("isSameOriginRequest", () => {
  it("lets GET and HEAD through with no headers", () => {
    expect(isSameOriginRequest(req("GET"))).toBe(true);
    expect(isSameOriginRequest(req("HEAD"))).toBe(true);
  });

  it("rejects a foreign Origin", () => {
    expect(isSameOriginRequest(req("POST", { origin: "https://evil.example" }))).toBe(false);
  });

  it("rejects Origin null and cross-site fetch metadata", () => {
    expect(isSameOriginRequest(req("POST", { origin: "null" }))).toBe(false);
    expect(isSameOriginRequest(req("POST", { "sec-fetch-site": "cross-site" }))).toBe(false);
  });

  it("accepts a matching Origin", () => {
    expect(isSameOriginRequest(req("POST", { origin: "https://app.flump.test" }))).toBe(true);
  });

  it("accepts a matching Origin behind a proxy", () => {
    const request = req(
      "DELETE",
      {
        origin: "https://www.flump.test",
        "x-forwarded-host": "www.flump.test",
        "x-forwarded-proto": "https",
      },
      "http://internal:3000/x",
    );
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("accepts Sec-Fetch-Site same-origin", () => {
    expect(isSameOriginRequest(req("PATCH", { "sec-fetch-site": "same-origin" }))).toBe(true);
  });

  it("rejects an unsafe request with neither header", () => {
    expect(isSameOriginRequest(req("POST"))).toBe(false);
    expect(isSameOriginRequest(req("PUT"))).toBe(false);
  });
});

describe("csrfRejection", () => {
  it("is a 403", () => {
    expect(csrfRejection().status).toBe(403);
  });
});
