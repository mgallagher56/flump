import { describe, expect, it } from "vitest";
import {
  applyFullCsp,
  buildCsp,
  FULL_CSP_HEADER_NAME,
  formActionOrigins,
  generateNonce,
} from "./csp.server";

const MARKETING = "https://marketing.flump.test";

function directive(policy: string, name: string): string {
  const found = policy.split("; ").find((d) => d === name || d.startsWith(`${name} `));
  if (!found) throw new Error(`no ${name} directive`);
  return found;
}

describe("generateNonce", () => {
  it("is 128 bits of base64url", () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(Buffer.from(nonce, "base64url")).toHaveLength(16);
  });

  it("is unique per call", () => {
    const seen = new Set(Array.from({ length: 1000 }, () => generateNonce()));
    expect(seen.size).toBe(1000);
  });
});

describe("buildCsp", () => {
  const policy = buildCsp({
    nonce: "abc123",
    formActionOrigins: ["https://api.workos.com", MARKETING],
  });

  it("puts the nonce in script-src and never allows unsafe-inline or unsafe-eval there", () => {
    expect(directive(policy, "script-src")).toBe("script-src 'self' 'nonce-abc123'");
    expect(policy).not.toMatch(/script-src[^;]*unsafe-/);
  });

  it("keeps unsafe-inline for styles only", () => {
    expect(directive(policy, "style-src")).toBe("style-src 'self' 'unsafe-inline'");
    expect(policy.match(/unsafe-inline/g)).toHaveLength(1);
  });

  it("allows exactly self and the Sentry EU ingest host for connect-src", () => {
    expect(directive(policy, "connect-src")).toBe(
      "connect-src 'self' https://*.ingest.de.sentry.io",
    );
  });

  it("lists exact form-action origins with no wildcard", () => {
    expect(directive(policy, "form-action")).toBe(
      `form-action 'self' https://api.workos.com ${MARKETING}`,
    );
  });

  it("has the fixed locked-down directives", () => {
    expect(directive(policy, "default-src")).toBe("default-src 'self'");
    expect(directive(policy, "img-src")).toBe("img-src 'self' data: blob: https:");
    expect(directive(policy, "font-src")).toBe("font-src 'self'");
    expect(directive(policy, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(policy, "object-src")).toBe("object-src 'none'");
    expect(directive(policy, "base-uri")).toBe("base-uri 'none'");
    expect(directive(policy, "report-uri")).toBe("report-uri /csp-report");
  });
});

describe("formActionOrigins", () => {
  it("returns the WorkOS and marketing origins, de-duplicated and path-free", () => {
    expect(formActionOrigins({}, `${MARKETING}/some/path?x=1`)).toEqual([
      "https://api.workos.com",
      MARKETING,
    ]);
  });

  it("honours WORKOS_API_HOSTNAME and drops an unparseable marketing URL", () => {
    expect(formActionOrigins({ WORKOS_API_HOSTNAME: "workos.example.test" }, "not a url")).toEqual([
      "https://workos.example.test",
    ]);
  });
});

describe("applyFullCsp", () => {
  const options = { nonce: "n1", formActionOrigins: [] };

  it("sets the report-only header and leaves the enforced one alone", () => {
    const res = new Response("x", {
      headers: { "Content-Security-Policy": "frame-ancestors 'none'" },
    });
    const out = applyFullCsp(res, options);
    expect(FULL_CSP_HEADER_NAME).toBe("Content-Security-Policy-Report-Only");
    expect(out.headers.get("content-security-policy-report-only")).toContain("'nonce-n1'");
    expect(out.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
  });

  it("copies an immutable response", () => {
    const out = applyFullCsp(Response.redirect("https://x.test/", 302), options);
    expect(out.status).toBe(302);
    expect(out.headers.get("location")).toBe("https://x.test/");
    expect(out.headers.has("content-security-policy-report-only")).toBe(true);
  });
});
