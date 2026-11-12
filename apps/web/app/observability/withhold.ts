import { scrubEvent } from "@flump/observability";

export const WITHHELD = "[message withheld]";

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null;

/**
 * Error messages are never sent to Sentry. Provider and user text can end up in them (a failed
 * backend call, a thrown form value), which the pattern scrubber cannot reliably clean. Each
 * exception keeps its `type` and scrubbed frames; `value` (linked causes are further entries of
 * `exception.values`) and the event `message` / `logentry` are replaced.
 */
export function withholdMessages(event: Json): Json {
  const exception = event.exception;
  if (isObject(exception) && Array.isArray(exception.values)) {
    exception.values = exception.values.map((v) =>
      isObject(v) && "value" in v ? { ...v, value: WITHHELD } : v,
    );
  }
  if (typeof event.message === "string") event.message = WITHHELD;
  if (isObject(event.logentry)) event.logentry = { message: WITHHELD };
  return event;
}

/** beforeSend: withhold messages first, then run the shared scrubber over what is left. */
export function beforeSend(event: Json): Json | null {
  return (scrubEvent as unknown as (e: Json) => Json | null)(withholdMessages(event));
}
