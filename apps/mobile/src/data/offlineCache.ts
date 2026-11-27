/**
 * Offline reading (E12 S7; plan 4.6, O4 and O5 seam 4): the last good answers of the reads Home,
 * Accounts, an account's page and the net worth history are built from, kept sealed on this phone
 * (`cacheStore.ts`) for at most 7 days, and put back into the query cache when the app opens with
 * no connection. Read-only: nothing here sends a request or saves a change.
 *
 * Rules it keeps:
 * - Saved only after a read succeeds while someone is signed in and online (`canSave`), never from
 *   what was itself loaded from the cache, so a figure's time is always when Flump last sent it.
 * - Loaded back only through the same contract parsing as a live answer (`parseResponse` with the
 *   read's own schema), so a cache from an older app is read with today's defaults, and one that
 *   no longer parses is dropped, never shown.
 * - All or nothing: the figures show offline only when every read is saved and none is older than
 *   7 days. A partial picture (accounts without their months) could show a wrong net worth.
 * - Never over a fresher answer already in memory.
 * - The names inside the file are the reads' own (`accounts`), never an id, a token or a name.
 */
import { parseResponse } from "@flump/api-client";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { AppBudgetEntryList } from "./budget";
import type { CacheStore } from "./cacheStore";
import { AppAccountDetailList, AppAccountList, AppCheckIns } from "./checkIn";
import { AppProfile } from "./profile";
import { queryKeys } from "./queryKeys";

/** Kept this long, then dropped (O4: "7 days"). */
export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** A saved time this far ahead of the phone's clock is not believed. */
const CLOCK_SKEW_MS = 5 * 60 * 1000;
/** Bumped when the file's shape changes; any other version is dropped. */
export const CACHE_FORMAT = 1;

interface CachedRead {
  key: QueryKey;
  /** The same schema the live read parses with. */
  schema: { safeParse(value: unknown): { success: boolean; data?: unknown } };
}

/** Every read offline reading needs, by the name it has in the file. */
export const CACHED_READS = {
  accounts: { key: queryKeys.accounts(), schema: AppAccountList },
  accountDetails: { key: queryKeys.accountDetails(), schema: AppAccountDetailList },
  // Null is a person with no profile yet, as `fetchProfile` gives it.
  userProfile: { key: queryKeys.userProfile(), schema: AppProfile.nullable() },
  checkIns: { key: queryKeys.checkIns(), schema: AppCheckIns },
  budgetEntries: { key: queryKeys.budgetEntries(), schema: AppBudgetEntryList },
} satisfies Record<string, CachedRead>;

type ReadName = keyof typeof CACHED_READS;
const READ_NAMES = Object.keys(CACHED_READS) as ReadName[];

/** What the file holds. */
interface Envelope {
  format: number;
  reads: Partial<Record<ReadName, { savedAt: number; data: unknown }>>;
}

/** What was put back: the oldest saved time among the reads, for the "last updated" line. */
export interface SavedFigures {
  savedAt: number;
}

export interface OfflineCache {
  /**
   * Puts the saved reads into `queryClient`, where it holds none, and gives their oldest time; null
   * when there is nothing usable. Called only from inside the signed-in shell, so never while the
   * app lock covers the app.
   */
  restore(queryClient: QueryClient, stillWanted?: () => boolean): Promise<SavedFigures | null>;
  /** Saves the reads after every successful one while `canSave()`. Returns the way to stop. */
  watch(queryClient: QueryClient, canSave: () => boolean): () => void;
  /** Forgets everything, and stops any save not yet started. Never throws. */
  wipe(): Promise<void>;
}

const keyOf = (key: QueryKey) => JSON.stringify(key);
const CACHED_KEYS = new Map(READ_NAMES.map((name) => [keyOf(CACHED_READS[name].key), name]));

export function createOfflineCache(deps: { store: CacheStore; now(): number }): OfflineCache {
  /** Bumped by every wipe: a save planned before it is dropped. */
  let generation = 0;

  function parseEnvelope(text: string): Envelope | null {
    try {
      const value: unknown = JSON.parse(text);
      if (typeof value !== "object" || value === null) return null;
      const { format, reads } = value as { format?: unknown; reads?: unknown };
      if (format !== CACHE_FORMAT || typeof reads !== "object" || reads === null) return null;
      return { format, reads: reads as Envelope["reads"] };
    } catch {
      return null;
    }
  }

  /** Each read parsed as a live answer is, or null when any is missing, too old or out of step. */
  function usableReads(
    envelope: Envelope,
  ): Map<ReadName, { savedAt: number; data: unknown }> | null {
    const now = deps.now();
    const out = new Map<ReadName, { savedAt: number; data: unknown }>();
    for (const name of READ_NAMES) {
      const saved = envelope.reads[name];
      if (typeof saved !== "object" || saved === null) return null;
      const { savedAt } = saved;
      if (typeof savedAt !== "number" || !Number.isFinite(savedAt)) return null;
      if (savedAt > now + CLOCK_SKEW_MS || now - savedAt > MAX_AGE_MS) return null;
      const parsed = parseResponse(CACHED_READS[name].schema as never, saved.data) as {
        success: boolean;
        data?: unknown;
      };
      if (!parsed.success) return null;
      out.set(name, { savedAt, data: parsed.data });
    }
    return out;
  }

  async function restore(
    queryClient: QueryClient,
    stillWanted: () => boolean = () => true,
  ): Promise<SavedFigures | null> {
    const startedAt = generation;
    const text = await deps.store.read();
    if (!text || startedAt !== generation) return null;
    const envelope = parseEnvelope(text);
    const reads = envelope ? usableReads(envelope) : null;
    if (!reads) {
      // Too old, from another format, or no longer parsing: it will never be shown, so it goes.
      await deps.store.wipe();
      return null;
    }
    // Asked again right before the figures go in, with no await after: a sign-out (or a session
    // end) that began while the file was read already cleared the query cache, and nothing may
    // be put back into it.
    if (startedAt !== generation || !stillWanted()) return null;
    let oldest = Number.POSITIVE_INFINITY;
    for (const [name, { savedAt, data }] of reads) {
      const key = CACHED_READS[name].key;
      const live = queryClient.getQueryState(key);
      // A fresher answer is already in memory: keep it, and its own time.
      if (live?.data !== undefined) {
        oldest = Math.min(oldest, live.dataUpdatedAt);
        continue;
      }
      queryClient.setQueryData(key, data, { updatedAt: savedAt });
      oldest = Math.min(oldest, savedAt);
    }
    return { savedAt: oldest };
  }

  function watch(queryClient: QueryClient, canSave: () => boolean): () => void {
    let saving = false;
    let again = false;
    /** The wipe count when the latest save was asked for: a wipe since then drops it. */
    let askedAt = generation;

    async function save() {
      if (saving) {
        again = true;
        return;
      }
      saving = true;
      try {
        do {
          again = false;
          if (!canSave()) return;
          const planned = askedAt;
          const reads: Envelope["reads"] = {};
          for (const name of READ_NAMES) {
            const state = queryClient.getQueryState(CACHED_READS[name].key);
            if (state?.status === "success" && state.data !== undefined) {
              reads[name] = { savedAt: state.dataUpdatedAt, data: state.data };
            }
          }
          if (Object.keys(reads).length === 0 || planned !== generation) return;
          try {
            await deps.store.write(JSON.stringify({ format: CACHE_FORMAT, reads }));
          } catch {
            // The store is locked or full: the next successful read tries again.
          }
        } while (again);
      } finally {
        saving = false;
      }
    }

    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "success") return;
      // A value set by hand (`setQueryData`: the restore itself, a write's answer) is not a read.
      if (event.action.manual) return;
      if (!CACHED_KEYS.has(keyOf(event.query.queryKey))) return;
      askedAt = generation;
      void save();
    });
  }

  async function wipe() {
    generation += 1;
    try {
      await deps.store.wipe();
    } catch {
      // `CacheStore.wipe` never throws; a stand-in might.
    }
  }

  return { restore, watch, wipe };
}
