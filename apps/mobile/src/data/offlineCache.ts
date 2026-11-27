/**
 * Offline reading (E12 S7; plan 4.6, O4 and O5 seam 4): the last good answers of the reads Home,
 * Accounts, an account's page and the net worth history are built from, kept sealed on this phone
 * (`cacheStore.ts`) for at most 7 days, and put back into the query cache when the app opens with
 * no connection. Read-only: nothing here sends a request or saves a change.
 *
 * Rules it keeps:
 * - Saved after a read succeeds while someone is signed in and online (`canSave`). Each save writes
 *   every read held in memory, so a read restored from the cache is written again beside a fresh
 *   one, but always with its own `dataUpdatedAt`, which a restore sets to the saved time: a figure's
 *   time is always when Flump last sent it, and a restore alone never makes it look newer.
 * - The phone's clock is not trusted to go forward: the file keeps the latest time this phone has
 *   seen (`seenAt`), and a clock earlier than that is treated as too old, so turning the clock back
 *   does not stretch the 7 days. While saved figures are on screen their age is checked again each
 *   minute (`isFresh`). What this cannot catch: a phone kept offline whose clock is honest reads for
 *   the full 7 days, and one whose clock is held at a time after the last use keeps reading.
 * - Loaded back only through the same contract parsing as a live answer (`parseResponse` with the
 *   read's own schema), so a cache from an older app is read with today's defaults, and one that
 *   no longer parses is dropped, never shown.
 * - All or nothing: the figures show offline only when every read is saved and none is older than
 *   7 days. A partial picture (accounts without their months) could show a wrong net worth.
 * - Never over a fresher answer already in memory.
 * - The names inside the file are the reads' own (`accounts`), never an id, a token or a name.
 * - Sealed for the signed-in person (`owner`, a hash of their `sub`): no owner, no cache.
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
/** Bumped when the file's shape changes; any other version is dropped. 2: `seenAt`. */
export const CACHE_FORMAT = 2;

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
  /** The latest time this phone's clock has shown while the cache was in use. */
  seenAt: number;
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
  /**
   * Whether figures saved at `savedAt` may still show now: within 7 days of the later of the clock
   * and the latest time seen, and the clock not turned back past that time.
   */
  isFresh(savedAt: number): boolean;
  /** Forgets everything, and stops any save not yet started. Never throws. */
  wipe(): Promise<void>;
}

const keyOf = (key: QueryKey) => JSON.stringify(key);
const CACHED_KEYS = new Map(READ_NAMES.map((name) => [keyOf(CACHED_READS[name].key), name]));

export function createOfflineCache(deps: {
  store: CacheStore;
  now(): number;
  /** The signed-in person, hashed (`Session.cacheOwner`); null turns the cache off. */
  owner(): Promise<string | null>;
}): OfflineCache {
  /** Bumped by every wipe: a save planned before it is dropped. */
  let generation = 0;
  /** The latest time seen, from the file and from the clock since. */
  let highWater = 0;

  /** The time to judge age by, or null when the clock was turned back past the latest seen. */
  function trustedNow(): number | null {
    const now = deps.now();
    if (now < highWater - CLOCK_SKEW_MS) return null;
    highWater = Math.max(highWater, now);
    return highWater;
  }

  function parseEnvelope(text: string): Envelope | null {
    try {
      const value: unknown = JSON.parse(text);
      if (typeof value !== "object" || value === null) return null;
      const { format, seenAt, reads } = value as {
        format?: unknown;
        seenAt?: unknown;
        reads?: unknown;
      };
      if (format !== CACHE_FORMAT || typeof reads !== "object" || reads === null) return null;
      if (typeof seenAt !== "number" || !Number.isFinite(seenAt)) return null;
      return { format, seenAt, reads: reads as Envelope["reads"] };
    } catch {
      return null;
    }
  }

  /** Each read parsed as a live answer is, or null when any is missing, too old or out of step. */
  function usableReads(
    envelope: Envelope,
    now: number,
  ): Map<ReadName, { savedAt: number; data: unknown }> | null {
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
    const owner = await deps.owner();
    if (!owner) {
      // Nobody to seal for: whatever is there can never be shown.
      await deps.store.wipe();
      return null;
    }
    const text = await deps.store.read(owner);
    if (!text || startedAt !== generation) return null;
    const envelope = parseEnvelope(text);
    if (envelope) highWater = Math.max(highWater, envelope.seenAt);
    const now = envelope ? trustedNow() : null;
    const reads = envelope && now !== null ? usableReads(envelope, now) : null;
    if (!envelope || !reads) {
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
    // The latest time seen goes back into the file, so a clock turned back before the next start
    // is caught then. The store runs this before any later wipe.
    try {
      await deps.store.write(JSON.stringify({ ...envelope, seenAt: highWater }), owner);
    } catch {
      // A locked or full store: the time in memory still guards this run.
    }
    return { savedAt: oldest };
  }

  function isFresh(savedAt: number): boolean {
    const now = trustedNow();
    return now !== null && now - savedAt <= MAX_AGE_MS;
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
            const owner = await deps.owner();
            if (!owner || planned !== generation || !canSave()) return;
            const seenAt = Math.max(highWater, deps.now());
            highWater = seenAt;
            await deps.store.write(JSON.stringify({ format: CACHE_FORMAT, seenAt, reads }), owner);
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

  return { restore, watch, isFresh, wipe };
}
