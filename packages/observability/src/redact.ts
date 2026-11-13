export const REDACTED = "[redacted]";
export const CIRCULAR = "[circular]";

const SENSITIVE_KEY =
  /token|secret|password|passwd|authori[sz]ation|cookie|session|dsn|api.?key|balance|amount|salary|income|value|price|payment|contribution|iban|sort.?code|account.?number|receipt|email|name|phone|address|dob|birth|code|state/i;

const EMAIL_SOURCE = "[^\\s@/?#]{1,64}@[^\\s@/?#]{1,255}\\.[^\\s@/?#]{1,63}";

/** True if the text contains something that looks like an email address. */
export function hasEmail(text: string): boolean {
  return new RegExp(EMAIL_SOURCE).test(text.slice(0, MAX_STRING_LENGTH));
}

// `auth` needs a non-letter after it so `author:` is left alone; `authorization` is its own entry.
const CREDENTIAL_KEYS =
  "password|passwd|pwd|secret|token|api[_-]?key|apikey|auth(?![a-z])|authorization|bearer|cookie|session|client_secret|access_token|refresh_token";
const STRONG_KEYS = "password|passwd|passw0rd|pwd|pw|secret";
// After a key: an optional `_x`/`-x` suffix or a known word (`sessionId`), but not `tokenizer`.
const KEY_SUFFIX = "(?:s|[_-][\\w-]{0,31}|id|hash|key|value|phrase|token|secret)?";
// Closing quote (plain, backslash-escaped or %22) then `=`/`:` (plain or URL-encoded), then spaces.
// Fullwidth `＂`, `＝` and `：` are accepted too.
const SEPARATOR = String.raw`(?:\\?["'\uFF02]|%22)?\s{0,4}(?:[=:\uFF1D\uFF1A]|%3[DdAa])\s{0,4}`;
// Quoted values may contain escaped quotes (`\"`, `''`); every alternative starts with a different
// character class, so there is no nested ambiguity.
const QUOTED = String.raw`\\"[^"\\]{0,512}\\"|"(?:[^"\\]|\\.){0,512}"|'(?:[^'\\]|\\.|''){0,512}'`;

/** Plain English words ("Basic Information") are not base64 credentials. */
const WORD_LIKE = /^[A-Za-z][a-z]{3,}$/;

/**
 * Free-text credential shapes. Every quantifier is bounded (see the per-pattern limits) and the
 * input is capped at MAX_STRING_LENGTH before matching, so no pattern backtracks catastrophically.
 * Each match keeps the key (group 1 where present) and replaces only the secret part.
 */
const CREDENTIAL_PATTERNS: ReadonlyArray<readonly [RegExp, string | ((...m: string[]) => string)]> =
  [
    // scheme://user:pass@host (userinfo of any connection URL)
    [/\b([a-z][a-z0-9+.-]{1,20}:\/\/)[^\s/@?#]{1,256}@/gi, `$1${REDACTED}@`],
    // Cookie: / Set-Cookie: header text runs to the end of the line
    [/(\b(?:set-)?cookie\s{0,4}[:=]\s{0,4})[^\r\n]{1,2048}/gi, `$1${REDACTED}`],
    // The scheme word is dropped too, so a following key rule has nothing left to match.
    [/\bBearer\s{1,8}\S{1,4096}/gi, REDACTED],
    [
      /\bBasic\s{1,8}([A-Za-z0-9+/_-]{8,2048}={0,2})/gi,
      (match, value) => (WORD_LIKE.test(value) ? match : REDACTED),
    ],
    // JWTs. Anchored on the start of a word run (a captured delimiter instead of a lookbehind, which
    // Safari < 16.4 cannot parse) so repeated `eyJ` prefixes cannot make matching quadratic; glued
    // prefixes of up to 2048 characters are covered (one attempt per word run keeps this linear).
    [/(^|[^\w-])[\w-]{0,2048}?eyJ[\w-]{1,2048}\.[\w-]{1,2048}\.[\w-]{0,2048}/g, `$1${REDACTED}`],
    // password/secret values may contain spaces: an unquoted value runs to the end of the line or & , ;
    [
      new RegExp(
        `((?:${STRONG_KEYS})${KEY_SUFFIX}${SEPARATOR})(?:${QUOTED}|["']?(?:[^\\r\\n&,;"'\\\\]|\\\\.){1,512})`,
        "gi",
      ),
      `$1${REDACTED}`,
    ],
    // other keys: key=value / key: value / "key":"value"; an unquoted value stops at whitespace, & , ;
    [
      new RegExp(
        `((?:${CREDENTIAL_KEYS})${KEY_SUFFIX}${SEPARATOR})(?:${QUOTED}|["']?(?:[^\\s&,;"'\\\\]|\\\\.){1,512})`,
        "gi",
      ),
      `$1${REDACTED}`,
    ],
  ];

function redactCredentialText(input: string): string {
  let out = input;
  for (const [pattern, replacement] of CREDENTIAL_PATTERNS) {
    out = out.replace(pattern, replacement as string);
  }
  return out;
}

// Order matters: specific shapes first, broad catch-alls last.
const STRING_PATTERNS: readonly RegExp[] = [
  new RegExp(EMAIL_SOURCE, "g"),
  /Bearer\s{1,8}\S+/gi,
  /sk_(?:test|live)_\w+/g,
  /\b[A-Za-z]{2}\d{2}(?: [A-Za-z0-9]{4}){4,7}(?: [A-Za-z0-9]{1,4})?\b/g,
  /\b[A-Za-z]{2}\d{2}[A-Za-z0-9]{11,30}\b/g,
  /\b\d{4}(?:[ -]\d{4}){3}\b/g,
  /\?[^\s#]*(?:#\S*)?/g,
  /[A-Za-z0-9+/_-]{32,}/g,
  /£\s?[\d,]+(?:\.\d+)?/g,
  /\b\d{2}-\d{2}-\d{2}\b/g,
  /\b\d{1,15}\.\d{2}\b/g,
  /\d{6,}/g,
];

const MAX_DEPTH = 12;
const MAX_NODES = 5000;
const NUMBER_LIMIT = 1000;

export const MAX_STRING_LENGTH = 8192;
const TRUNCATED = "[truncated]";

/** True for object keys whose values must never leave the process. */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

// Zero-width characters have no legitimate use in logs and would split a key (`pass\u200Bword`).
const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;

function capLength(input: string): string {
  input = input.replace(ZERO_WIDTH, "");
  // Truncate before any regex runs so adversarial input cannot cause slow matching.
  return input.length > MAX_STRING_LENGTH
    ? `${input.slice(0, MAX_STRING_LENGTH)}${TRUNCATED}`
    : input;
}

/**
 * Redacts only credential shapes (key=value pairs, Bearer/Basic, Cookie headers, URL userinfo). Unlike
 * `redactString` it leaves long path-like tokens and digits alone, so it is safe for stack-frame lines.
 */
export function redactCredentials(input: string): string {
  return redactCredentialText(capLength(input));
}

export function redactString(input: string): string {
  let out = redactCredentialText(capLength(input));
  for (const pattern of STRING_PATTERNS) {
    out = out.replace(pattern, REDACTED);
  }
  return out;
}

interface Walk {
  seen: WeakSet<object>;
  nodes: number;
}

function walk(value: unknown, depth: number, state: Walk): unknown {
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number") {
    const risky =
      Number.isFinite(value) && (!Number.isInteger(value) || Math.abs(value) >= NUMBER_LIMIT);
    return risky ? REDACTED : value;
  }
  if (typeof value === "bigint" || typeof value === "symbol" || typeof value === "function") {
    return REDACTED;
  }
  if (value === null || typeof value !== "object") return value;
  if (state.seen.has(value)) return CIRCULAR;
  state.seen.add(value);
  state.nodes += 1;
  if (depth >= MAX_DEPTH || state.nodes > MAX_NODES) return REDACTED;
  if (value instanceof Error) {
    return { name: redactString(value.name), message: redactString(value.message) };
  }
  if (value instanceof Map || value instanceof Set || value instanceof Date) return REDACTED;
  if (Array.isArray(value)) return value.map((item) => walk(item, depth + 1, state));
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    out[key] = isSensitiveKey(key) ? REDACTED : walk(child, depth + 1, state);
  }
  return out;
}

export function redactDeep(value: unknown): unknown {
  return walk(value, 0, { seen: new WeakSet(), nodes: 0 });
}
