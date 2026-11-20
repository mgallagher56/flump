import { describe, expect, it } from "vitest";
import {
  cutAtBoundary,
  isSensitiveKey,
  MAX_STRING_LENGTH,
  redactCredentials,
  redactDeep,
  redactString,
} from "./redact.js";

const jwt = `${"eyJ"}${"a".repeat(10)}.${"b".repeat(10)}.${"c".repeat(10)}`;

describe("redactString", () => {
  it.each([
    ["email", "mail sentinel@example.com now", "sentinel@example.com"],
    ["bearer", "Authorization: Bearer abc123tok", "abc123tok"],
    ["jwt", `tok ${jwt}`, jwt],
    ["stripe-like key", `k ${"sk_"}${"live_"}${"y".repeat(20)}`, "y".repeat(20)],
    ["long token", `v ${"A1b2".repeat(10)}`, "A1b2".repeat(10)],
    ["pounds", "paid £1,234.56 today", "1,234.56"],
    ["pounds spaced", "paid £ 99 today", "99"],
    ["decimal", "total 12.34 due", "12.34"],
    ["sort code", "sc 12-34-56 ok", "12-34-56"],
    ["digit run", "acct 12345678 ok", "12345678"],
    ["query string", "GET /p?code=zzz&x=1#h done", "code=zzz"],
  ])("redacts %s", (_label, input, secret) => {
    const out = redactString(input);
    expect(out).not.toContain(secret);
    expect(out).toContain("[redacted]");
  });

  it("leaves harmless text alone", () => {
    expect(redactString("TypeError at line 42")).toBe("TypeError at line 42");
  });
});

describe("redactDeep", () => {
  it("redacts sensitive keys, recurses and keeps safe values", () => {
    const out = redactDeep({
      Authorization: "x",
      nested: {
        password: "p",
        ok: "fine",
        list: [{ email: "e" }, "me@example.com", 3, null, true],
      },
      count: 3,
    });
    expect(out).toEqual({
      Authorization: "[redacted]",
      nested: {
        password: "[redacted]",
        ok: "fine",
        list: [{ email: "[redacted]" }, "[redacted]", 3, null, true],
      },
      count: 3,
    });
  });

  it("does not redact exception.type-like safe keys", () => {
    expect(redactDeep({ type: "TypeError" })).toEqual({ type: "TypeError" });
  });

  it("stops at the depth limit", () => {
    let deep: unknown = "leaf";
    for (let i = 0; i < 20; i++) deep = { a: deep };
    expect(JSON.stringify(redactDeep(deep))).toContain("[redacted]");
    expect(JSON.stringify(redactDeep(deep))).not.toContain("leaf");
  });
});

describe("redactString on text over the length limit", () => {
  it("drops a credential that the 8,192-character limit would cut in half", () => {
    // 4,085 "x " pairs are 8,170 characters; "https://user:" adds 13, so the password starts at
    // 8,183 and the limit falls 9 characters into it, before its closing "@".
    const text = `${"x ".repeat(4085)}https://user:${"pa!ss.".repeat(50)}@h.test`;
    const out = redactString(text);
    expect(out).not.toContain("pa!ss");
    expect(out.endsWith("[truncated]")).toBe(true);
  });
});

describe("redactString on long credentials inside the length limit", () => {
  const secret = (n: number) => "Pw!z9.".repeat(n);

  it("drops a userinfo longer than 256 characters from free text", () => {
    const text = `ECONNREFUSED postgres://app:${secret(50)}@db:5432/x`; // 300-character password
    expect(redactString(text)).not.toContain("Pw!z9");
  });

  it("drops everything after a Cookie header longer than 2,048 characters", () => {
    const text = `Cookie: ${"a=b; ".repeat(600)}TAIL=${secret(2)}`; // 3,000 characters of pairs first
    expect(redactString(text)).not.toContain("Pw!z9");
  });
});

describe("isSensitiveKey", () => {
  it("matches camelCase forms with no separator", () => {
    // The key list allows an optional separator in `api.?key` and `account.?number`, so the
    // camelCase spellings (no separator at all) must still count as sensitive.
    expect(isSensitiveKey("apiKey")).toBe(true);
    expect(isSensitiveKey("accountNumber")).toBe(true);
  });
});

describe("redactCredentials exact shapes", () => {
  it("redacts a whole Cookie header line, however it is spaced", () => {
    // Header text runs to the end of the line, so every pair after the colon goes, not just the
    // first one; zero spaces after the colon, and a space before it, are both header forms.
    expect(redactCredentials("Cookie: sid=abc; theme=dark")).toBe("Cookie: [redacted]");
    expect(redactCredentials("Set-Cookie:sid=abc; Path=/; HttpOnly")).toBe("Set-Cookie:[redacted]");
    expect(redactCredentials("Cookie : sid=abc; theme=dark")).toBe("Cookie : [redacted]");
  });

  it("drops the whole Bearer value, even after several spaces", () => {
    // The scheme word and the full value are replaced by one marker; text after it stays.
    expect(redactCredentials("Bearer tok123 next")).toBe("[redacted] next");
    expect(redactCredentials("Bearer  tok123 next")).toBe("[redacted] next");
  });

  it("redacts a Basic value that is not a plain English word", () => {
    // "abcd1234efgh" mixes letters and digits, so it is not word-like (a capital or small letter
    // followed only by small letters) even though it starts and ends with letters.
    expect(redactCredentials("hdr Basic abcd1234efgh")).toBe("hdr [redacted]");
    expect(redactCredentials("hdr Basic  abcd1234efgh")).toBe("hdr [redacted]");
  });

  it("redacts all three parts of a JWT", () => {
    expect(redactCredentials(`x ${jwt} y`)).toBe("x [redacted] y");
  });

  it("redacts every password-like value in any case, spaces included", () => {
    // Both keys are strong keys, matched without regard to case; each value runs to the `&`.
    expect(redactCredentials("password=one two&PWD=three four")).toBe(
      "password=[redacted]&PWD=[redacted]",
    );
  });

  it("does not truncate input of exactly the maximum length", () => {
    const atLimit = "a".repeat(MAX_STRING_LENGTH);
    expect(redactCredentials(atLimit)).toBe(atLimit);
  });
});

describe("redactString exact shapes", () => {
  it("redacts every email address, not only the first", () => {
    expect(redactString("a1@example.com and b2@example.org")).toBe("[redacted] and [redacted]");
  });

  it("redacts a Bearer value glued to a preceding word", () => {
    // An escaped newline leaves the letter n right before "Bearer", so there is no word
    // boundary; the catch-all Bearer rule still removes the value, however many spaces follow.
    expect(redactString("line1\\nBearer  tok123")).toBe("line1\\n[redacted]");
  });

  it("redacts a whole Stripe-style key", () => {
    expect(redactString(`k ${"sk_"}${"live_"}abcdef`)).toBe("k [redacted]");
  });

  it("redacts spaced IBANs as one value", () => {
    // GB: GB82 then four groups of four and a group of two. AT: AT61 then exactly four groups,
    // ended by a full stop so no short trailing group follows.
    expect(redactString("iban GB82 WEST 1234 5698 7654 32 ok")).toBe("iban [redacted] ok");
    expect(redactString("iban AT61 1904 3002 3457 3201.")).toBe("iban [redacted].");
  });

  it("redacts an unspaced IBAN as one value", () => {
    expect(redactString("iban GB82WEST12345698765432 ok")).toBe("iban [redacted] ok");
  });

  it("keeps a code identifier that has only one digit after two letters", () => {
    // An IBAN has two digits after its two-letter country code; "Ui5C..." has one, so it stays.
    expect(redactString("at Ui5ComponentLoader.load")).toBe("at Ui5ComponentLoader.load");
  });

  it("redacts a card number as one value", () => {
    expect(redactString("card 4111-1111-1111-1111 ok")).toBe("card [redacted] ok");
  });

  it("redacts a query string that has no fragment", () => {
    // "?q=hello" runs from the "?" to the space; "q" is not a credential key, so only the query
    // rule removes it.
    expect(redactString("GET /p?q=hello done")).toBe("GET /p[redacted] done");
  });

  it("redacts the whole query string and fragment", () => {
    expect(redactString("GET /p?code=zzz#frag done")).toBe("GET /p[redacted] done");
  });

  it("redacts a whole pound amount", () => {
    expect(redactString("paid £1,234.56 today")).toBe("paid [redacted] today");
  });
});

describe("redactDeep arrays", () => {
  it("applies the depth limit to nested arrays as to objects", () => {
    let deep: unknown = "leaf";
    for (let i = 0; i < 20; i++) deep = [deep];
    expect(JSON.stringify(redactDeep(deep))).not.toContain("leaf");
  });
});

describe("cutAtBoundary", () => {
  const isSpace = (char: string) => char === " ";

  it("keeps text that is exactly at the limit whole", () => {
    // "abcd" is 4 characters and the limit is 4, so nothing is cut.
    expect(cutAtBoundary("abcd", 4, isSpace)).toBe("abcd");
  });

  it("cuts back to the last boundary before the limit", () => {
    // The limit of 5 keeps "ab cd"; the cut falls inside "cd", so that part-word goes and
    // the text ends at the space after "ab".
    expect(cutAtBoundary("ab cd ef", 5, isSpace)).toBe("ab ");
  });

  it("gives an empty string when no boundary comes before the limit", () => {
    // "abc" (the first 3 characters) holds no space, so the whole of it is a part-word.
    expect(cutAtBoundary("abcdef", 3, isSpace)).toBe("");
  });
});

describe("redactString keeps the words before the length limit", () => {
  it("cuts long text at the last whitespace before 8,192 characters", () => {
    // 3,000 copies of "ab " are 9,000 characters. Character 8,192 (index 8,191) is the "b" of a
    // copy, so the cut drops that "ab" and ends after 2,730 whole copies (8,190 characters).
    const out = redactString("ab ".repeat(3000));
    expect(out).toBe(`${"ab ".repeat(2730)}[truncated]`);
  });
});
