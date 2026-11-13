import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { redactCredentials, redactString } from "./redact.js";

describe("free-text credential redaction", () => {
  it.each([
    ["password=", "login failed password=hunter2 for x", "hunter2"],
    ["password:", "password: hunter2", "hunter2"],
    ["json key", '{"password":"hunter 2","ok":1}', "hunter 2"],
    ["single quoted", "token='ab cd' rest", "ab cd"],
    ["unterminated quote", 'secret="abcdef', "abcdef"],
    // Built at runtime so no secret-shaped literal is committed (gitleaks).
    ["api_key", `${"api"}_key=${"sk"}-short`, "sk-short"],
    ["api-key header", "x-api-key: kkk111", "kkk111"],
    ["apikey", "apikey=zzz999", "zzz999"],
    ["client_secret", "client_secret=cs-1&grant=x", "cs-1"],
    ["access_token", "access_token=at1,more", "at1"],
    ["refresh_token", "refresh_token=rt1;", "rt1"],
    ["session", "session=abc.def", "abc.def"],
    ["pwd", "pwd=p1", "p1"],
    ["Authorization Bearer", "Authorization: Bearer abc", "abc"],
    ["short bearer", "Bearer x", "x"],
    ["Basic", "Authorization: Basic dXNlcjpwYXNz", "dXNlcjpwYXNz"],
    ["Basic padded", "Basic dXNlcjpwYXNzMQ==", "dXNlcjpwYXNzMQ"],
    ["Cookie header", "Cookie: sid=abc; theme=dark\nnext", "sid=abc; theme=dark"],
    ["Set-Cookie", "Set-Cookie: sid=abc; HttpOnly", "sid=abc"],
    ["postgres url", "connect postgres://admin:s3cr3t@db.internal:5432/app failed", "s3cr3t"],
    ["url user only", "https://tok123@host.example/x", "tok123"],
  ])("redacts %s", (_label, input, secret) => {
    const out = redactString(input);
    expect(out).not.toContain(secret);
    expect(out).toContain("[redacted]");
  });

  it("keeps keys, scheme and surrounding text", () => {
    expect(redactString("password=hunter2&user=bob")).toBe("password=[redacted]&user=bob");
    expect(redactString("token=abc user=bob")).toBe("token=[redacted] user=bob");
    expect(redactString("postgres://u:p@db:5432/app")).toBe("postgres://[redacted]@db:5432/app");
    expect(redactString("Authorization: Basic dXNlcjpwYXNz")).toBe("Authorization: [redacted]");
    expect(redactString("Cookie: a=b")).toBe("Cookie: [redacted]");
  });

  it("is idempotent", () => {
    const once = redactString("password=hunter2 Bearer abc Basic dXNlcjpwYXNz");
    expect(redactString(once)).toBe(once);
  });

  it("leaves English prose after Basic alone", () => {
    expect(redactString("Basic Information and Basic plan")).toBe(
      "Basic Information and Basic plan",
    );
  });

  it("leaves error names and function names alone", () => {
    expect(redactString("TypeError: x is not a function")).toBe("TypeError: x is not a function");
    expect(redactString("at AuthService.validate")).toBe("at AuthService.validate");
  });

  it("redactCredentials keeps long paths and digit runs", () => {
    const path = "/srv/app/src/some/really/long/directory/name/file.ts:123456:7";
    expect(redactCredentials(`${path} password=x`)).toBe(`${path} password=[redacted]`);
  });

  it("truncates oversized input", () => {
    expect(redactCredentials("a ".repeat(10_000))).toMatch(/\[truncated\]$/);
  });

  it.each([
    [
      "escaped JSON",
      String.raw`{\"password\":\"hunter2\",\"token\":\"abcd1\"}`,
      ["hunter2", "abcd1"],
    ],
    ["url-encoded", "password%3Dhunter2&access_token%3Dabcd1", ["hunter2", "abcd1"]],
    ["url-encoded colon", "secret%3Ahunter2", ["hunter2"]],
    ["encoded quotes", "%22password%22%3A%22hunter2%22", ["hunter2"]],
    ["spaces in password", "password=my secret phrase here", ["secret phrase", "my "]],
    ["spaces then comma", "secret: a b c, next", ["a b c"]],
    ["quoted spaces", 'pwd="two words" x', ["two words"]],
    ["session id", "sessionId=abc123", ["abc123"]],
    ["session_id", "session_id=abc123", ["abc123"]],
    ["glued jwt", `xeyJ${"a".repeat(12)}.${"b".repeat(10)}.wxyz`, ["bbbbbbbbbb"]],
    ["jwt after dot", `a.eyJ${"a".repeat(12)}.${"b".repeat(10)}.wxyz`, ["bbbbbbbbbb"]],
  ])("handles %s", (_label, input, secrets) => {
    const out = redactString(input);
    for (const secret of secrets) expect(out).not.toContain(secret);
  });

  it.each([
    [
      "escaped quote in double quotes",
      JSON.stringify({ password: 'p"ass word', user: "bob" }),
      ["ass word"],
    ],
    ["backslash-escaped quote unquoted", String.raw`password=a\"b c`, ["b c"]],
    ["doubled single quote", "password='it''s'", ["s'"]],
    ["pw", "pw=abc123", ["abc123"]],
    ["passw0rd", "passw0rd: abc123", ["abc123"]],
    ["plural secrets", "secrets=abc123", ["abc123"]],
    ["plural tokens", "tokens: abc123", ["abc123"]],
    ["plural passwords", "passwords=abc123", ["abc123"]],
    ["plural apikeys", `${"api"}keys=abc123`, ["abc123"]],
    ["fullwidth equals", "password＝abc123", ["abc123"]],
    ["fullwidth colon and quote", "token＂：abc123", ["abc123"]],
    ["zero-width split key", "pass​word=abc123", ["abc123"]],
    [
      "long glued jwt prefix",
      `${"x".repeat(50)}eyJ${"a".repeat(10)}.eyJzdWIiOiIxIn0.sigsigsig`,
      ["eyJzdWIiOiIxIn0", "sigsigsig"],
    ],
  ])("handles %s", (_label, input, secrets) => {
    const out = redactString(input);
    for (const secret of secrets) expect(out).not.toContain(secret);
  });

  it("leaves author and tokenizer alone", () => {
    expect(redactString("author: bob")).toBe("author: bob");
    expect(redactString("tokenizer: fast")).toBe("tokenizer: fast");
    expect(redactString("auth: abc")).toBe("auth: [redacted]");
    expect(redactString("auth_token=abc")).toBe("auth_token=[redacted]");
  });

  it("module source contains no regex lookbehind (Safari < 16.4 cannot parse it)", () => {
    const source = readFileSync(new URL("./redact.ts", import.meta.url), "utf8");
    expect(source).not.toContain("(?<=");
    expect(source).not.toContain("(?<!");
  });

  it.each([
    ["password", "password=".repeat(25_000)],
    ["token colon", "token: ".repeat(30_000)],
    ["quotes", `secret="${"a ".repeat(100_000)}`],
    ["cookie", `cookie:${" ".repeat(200_000)}`],
    ["bearer", `Bearer${" ".repeat(200_000)}x`],
    ["basic", `Basic ${"A".repeat(200_000)}`],
    ["url", `a${"b".repeat(100_000)}://${"c".repeat(100_000)}`],
    ["scheme run", "ab://".repeat(40_000)],
    ["keys", "apikey-".repeat(30_000)],
    ["jwt prefixes", "eyJ".repeat(60_000)],
    ["jwt runs", "a eyJ".repeat(40_000)],
    ["jwt short runs then filler", `${"x eyJ".repeat(2000)}${"a".repeat(8000)}`],
    ["escaped quote runs", `password="\\"`.repeat(5000)],
    ["single quote runs", "password='''".repeat(5000)],
    ["strong spaces", `password=${"a ".repeat(100_000)}`],
    ["escaped quotes", String.raw`"password":"`.repeat(20_000)],
    ["at signs", "x:y@".repeat(50_000)],
  ])("is fast on 200k-char adversarial input (%s)", (_label, input) => {
    const start = performance.now();
    redactCredentials(input);
    expect(performance.now() - start).toBeLessThan(200);
  });
});
