export const REDACTED = "[redacted]";
export const CIRCULAR = "[circular]";

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
const MAX_NODES = 5000;
const NUMBER_LIMIT = 1000;

export function redactString(input: string): string {
  let out = input;
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
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : walk(child, depth + 1, state);
  }
  return out;
}

export function redactDeep(value: unknown): unknown {
  return walk(value, 0, { seen: new WeakSet(), nodes: 0 });
}
