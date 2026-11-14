import { describe, expect, it } from "vitest";
import {
  applyFullCsp,
  buildCsp,
  ENFORCED_CSP_HEADER,
  formActionOrigins,
  fullCspHeaderName,
  generateNonce,
  REPORT_ONLY_CSP_HEADER,
  sentryConnectOrigin,
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

  it("has connect-src self only when no connect origin is configured (no wildcard anywhere)", () => {
    expect(directive(policy, "connect-src")).toBe("connect-src 'self'");
    expect(policy).not.toContain("*");
  });

  it("adds exactly the configured connect origin", () => {
    const withSentry = buildCsp({
      nonce: "n",
      formActionOrigins: [],
      connectOrigins: ["https://o123.ingest.de.sentry.io"],
    });
    expect(directive(withSentry, "connect-src")).toBe(
      "connect-src 'self' https://o123.ingest.de.sentry.io",
    );
    expect(withSentry).not.toContain("*");
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
    expect(directive(policy, "report-to")).toBe("report-to csp-endpoint");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });

  it("adds upgrade-insecure-requests only when asked (production)", () => {
    const upgraded = buildCsp({ nonce: "n", formActionOrigins: [], upgradeInsecureRequests: true });
    expect(upgraded.split("; ")).toContain("upgrade-insecure-requests");
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

describe("origin validation (nothing can break out of a directive)", () => {
  const origins = (url: string) =>
    formActionOrigins({}, url).filter((o) => o !== "https://api.workos.com");

  it.each([
    "https://a.com;script-src",
    "https://a.com,b",
    "https://a b.com",
    "https://[::1]",
    "https://[2001:db8::1]:8443",
    "javascript:alert(1)",
    "ftp://a.com",
    "not a url",
  ])("drops %j without throwing", (value) => {
    expect(origins(value)).toEqual([]);
  });

  it("drops a host that carries ; or , even when the parser accepts it", () => {
    const policy = buildCsp({ nonce: "n", formActionOrigins: origins("https://a.com;script-src") });
    expect(policy.split("; ")).toHaveLength(12);
    expect(policy).not.toContain("a.com");
  });

  it("normalises userinfo, path, uppercase hosts and CR/LF to a plain origin", () => {
    expect(origins("https://user:pw@a.com/path?q=1")).toEqual(["https://a.com"]);
    expect(origins("HTTPS://A.COM:8443")).toEqual(["https://a.com:8443"]);
    expect(origins("https://a.com\r\n/x")).toEqual(["https://a.com"]);
  });
});

describe("sentryConnectOrigin", () => {
  it("returns only scheme and host from the DSN (no key, no project id)", () => {
    expect(sentryConnectOrigin({ SENTRY_DSN: "https://pubkey@o123.ingest.de.sentry.io/456" })).toBe(
      "https://o123.ingest.de.sentry.io",
    );
  });

  it("is null (no connect-src entry) when unset, blank, invalid or not https", () => {
    for (const SENTRY_DSN of [
      undefined,
      "",
      "  ",
      "nonsense",
      "http://k@o1.ingest.de.sentry.io/1",
      "https://k@[::1]/1",
      "https://k@a.com;x/1",
    ]) {
      expect(sentryConnectOrigin({ SENTRY_DSN })).toBeNull();
    }
  });
});

describe("applyFullCsp", () => {
  const options = { nonce: "n1", formActionOrigins: [] };

  it("enforces by default, replacing the frame-ancestors-only default (BE-07, M8)", () => {
    const res = new Response("x", {
      headers: { "Content-Security-Policy": "frame-ancestors 'none'" },
    });
    const out = applyFullCsp(res, options, {});
    const policy = out.headers.get("content-security-policy") ?? "";
    expect(policy).toMatch(/^default-src 'self'; script-src 'self' 'nonce-n1'/);
    expect(policy).toContain("frame-ancestors 'none'");
    expect(out.headers.has("content-security-policy-report-only")).toBe(false);
    expect(out.headers.get("reporting-endpoints")).toBe('csp-endpoint="/csp-report"');
  });

  it("goes back to report-only with CSP_REPORT_ONLY=true, keeping the enforced default", () => {
    const res = new Response("x", {
      headers: { "Content-Security-Policy": "frame-ancestors 'none'" },
    });
    const out = applyFullCsp(res, options, { CSP_REPORT_ONLY: "true" });
    expect(out.headers.get("content-security-policy-report-only")).toContain("'nonce-n1'");
    expect(out.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
    expect(out.headers.get("reporting-endpoints")).toBe('csp-endpoint="/csp-report"');
  });

  it("only exactly `true` selects report-only", () => {
    expect(fullCspHeaderName({})).toBe(ENFORCED_CSP_HEADER);
    for (const value of ["1", "TRUE", "yes", ""]) {
      expect(fullCspHeaderName({ CSP_REPORT_ONLY: value })).toBe(ENFORCED_CSP_HEADER);
    }
    expect(fullCspHeaderName({ CSP_REPORT_ONLY: "true" })).toBe(REPORT_ONLY_CSP_HEADER);
  });

  it("copies an immutable response", () => {
    const out = applyFullCsp(Response.redirect("https://x.test/", 302), options);
    expect(out.status).toBe(302);
    expect(out.headers.get("location")).toBe("https://x.test/");
    expect(out.headers.get("content-security-policy")).toContain("'nonce-n1'");
  });
});
