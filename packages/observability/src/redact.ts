export const REDACTED = "[redacted]";

const SENSITIVE_KEY =
  /token|secret|password|passwd|authori[sz]ation|cookie|session|dsn|api.?key|balance|amount|salary|income|value|price|payment|contribution|iban|sort.?code|account.?number|receipt|email|name|phone|address|dob|birth|code|state/i;

// Order matters: specific shapes first, broad catch-alls last.
const STRING_PATTERNS: readonly RegExp[] = [
  /[^\s@/?#]+@[^\s@/?#]+\.[^\s@/?#]+/g,
  /Bearer\s+\S+/gi,
  /eyJ[\w-]+\.[\w-]+\.[\w-]*/g,
  /sk_(?:test|live)_\w+/g,
  /\?[^\s#]*(?:#\S*)?/g,
  /[A-Za-z0-9+/_-]{32,}/g,
  /£\s?[\d,]+(?:\.\d+)?/g,
  /\b\d{2}-\d{2}-\d{2}\b/g,
  /\b\d+\.\d{2}\b/g,
  /\d{6,}/g,
];

const MAX_DEPTH = 12;

export function redactString(input: string): string {
  let out = input;
  for (const pattern of STRING_PATTERNS) {
    out = out.replace(pattern, REDACTED);
  }
  return out;
}

export function redactDeep(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return REDACTED;
  if (Array.isArray(value)) return value.map((item) => redactDeep(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactDeep(child, depth + 1);
  }
  return out;
}
