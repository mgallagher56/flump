export const REDACTED = "[redacted]";
export const CIRCULAR = "[circular]";

const SENSITIVE_KEY =
  /token|secret|password|passwd|authori[sz]ation|cookie|session|dsn|api.?key|balance|amount|salary|income|value|price|payment|contribution|iban|sort.?code|account.?number|receipt|email|name|phone|address|dob|birth|code|state/i;

const EMAIL_SOURCE = "[^\\s@/?#]{1,64}@[^\\s@/?#]{1,255}\\.[^\\s@/?#]{1,63}";

/** True if the text contains something that looks like an email address. */
export function hasEmail(text: string): boolean {
  return new RegExp(EMAIL_SOURCE).test(text.slice(0, MAX_STRING_LENGTH));
}

// Order matters: specific shapes first, broad catch-alls last.
const STRING_PATTERNS: readonly RegExp[] = [
  new RegExp(EMAIL_SOURCE, "g"),
  /Bearer\s{1,8}\S+/gi,
  /eyJ[\w-]{1,2048}\.[\w-]{1,2048}\.[\w-]{0,2048}/g,
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

export function redactString(input: string): string {
  // Truncate before any regex runs so adversarial input cannot cause slow matching.
  let out =
    input.length > MAX_STRING_LENGTH ? `${input.slice(0, MAX_STRING_LENGTH)}${TRUNCATED}` : input;
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
