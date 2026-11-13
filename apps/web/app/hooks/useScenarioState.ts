import { useCallback, useMemo, useState } from "react";

/** Saved figures keyed by input name. Unknown inputs are `null` or `undefined` and stay empty. */
export type ScenarioSaved = Record<string, unknown>;

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

/**
 * In-memory what-if state for a `ScenarioZone`. Seeds from `saved` (loader data), keeps edited
 * keys when `saved` changes (loader revalidation) and lets unedited keys follow the new saved
 * values. It never touches the network, storage or the URL, and nothing here writes to saved data.
 */
export function useScenarioState<T extends ScenarioSaved>(saved: T): ScenarioState<T> {
  // Only keys the user has changed to something other than the saved value live here.
  const [edits, setEdits] = useState<Partial<T>>({});

  const set = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setEdits((prev) => {
        if (Object.is(value, saved[key])) {
          if (!(key in prev)) return prev;
          const { [key]: _removed, ...rest } = prev;
          return rest as Partial<T>;
        }
        return { ...prev, [key]: value };
      });
    },
    [saved],
  );

  const reset = useCallback(() => setEdits({}), []);

  const values = useMemo(() => ({ ...saved, ...edits }) as T, [saved, edits]);

  const editedKeys = useMemo(() => {
    const keys = new Set<keyof T>();
    for (const key of Object.keys(edits) as (keyof T)[]) {
      if (!Object.is(edits[key], saved[key])) keys.add(key);
    }
    return keys;
  }, [edits, saved]);

  const isEdited = useCallback((key: keyof T) => editedKeys.has(key), [editedKeys]);

  return { values, set, reset, isModified: editedKeys.size > 0, isEdited };
}

export default useScenarioState;
