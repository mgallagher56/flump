import { useCallback, useMemo, useRef, useState } from "react";

/** Saved figures keyed by input name. Unknown inputs are `null` or `undefined` and stay empty. */
export type ScenarioSaved = Record<string, string | number | boolean | null | undefined>;

export interface ScenarioState<T extends ScenarioSaved> {
  /** Saved values overlaid with the user's scenario edits. Unknown saved inputs stay empty. */
  values: T;
  /** Sets one scenario input. Setting it back to the saved value clears its edited mark. */
  set: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Drops every scenario edit, so `values` is the saved figures again. */
  reset: () => void;
  /** True while at least one input differs from its saved value. */
  isModified: boolean;
  /** True while this input differs from its saved value. */
  isEdited: (key: keyof T) => boolean;
}

/** `-0` and `0` are the same figure. */
const normalise = <V>(value: V): V => ((value as unknown) === 0 ? (0 as unknown as V) : value);

const same = (a: unknown, b: unknown): boolean => Object.is(normalise(a), normalise(b));

function shallowEqual(a: ScenarioSaved, b: ScenarioSaved): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => key in b && same(a[key], b[key]));
}

/**
 * In-memory what-if state for a `ScenarioZone`. Seeds from `saved` (pass memoised or loader data;
 * an inline literal is tolerated too, as `saved` is compared shallowly and does not churn
 * identities). Keeps edited keys when `saved` changes (loader revalidation) and lets unedited keys
 * follow the new saved values. It never touches the network, storage or the URL, and nothing here
 * writes to saved data.
 */
export function useScenarioState<T extends ScenarioSaved>(saved: T): ScenarioState<T> {
  // Only keys the user has changed to something other than the saved value live here.
  const [edits, setEdits] = useState<Partial<T>>({});

  // Keep the previous object while the incoming one is structurally equal.
  const savedRef = useRef(saved);
  if (!shallowEqual(savedRef.current, saved)) savedRef.current = saved;
  const stableSaved = savedRef.current;

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    const next = normalise(value);
    setEdits((prev) => {
      if (same(next, savedRef.current[key as string])) {
        if (!(key in prev)) return prev;
        const { [key]: _removed, ...rest } = prev;
        return rest as Partial<T>;
      }
      return { ...prev, [key]: next };
    });
  }, []);

  const reset = useCallback(() => setEdits({}), []);

  const values = useMemo(() => ({ ...stableSaved, ...edits }) as T, [stableSaved, edits]);

  const editedKeys = useMemo(() => {
    const keys = new Set<keyof T>();
    for (const key of Object.keys(edits) as (keyof T)[]) {
      if (!same(edits[key], stableSaved[key as string])) keys.add(key);
    }
    return keys;
  }, [edits, stableSaved]);

  const isEdited = useCallback((key: keyof T) => editedKeys.has(key), [editedKeys]);

  return { values, set, reset, isModified: editedKeys.size > 0, isEdited };
}
