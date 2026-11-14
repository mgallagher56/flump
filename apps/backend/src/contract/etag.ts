import { ETAG_HEADER, etagFor, parseEtag } from "@flump/api-contract";
import { PreconditionFailedException } from "@nestjs/common";
import type { ObjectLiteral, Repository } from "typeorm";

/**
 * Optimistic concurrency for update routes (BE-09, audit M7, L15). The ETag of a resource is its
 * `updatedAt` as an ISO string in quotes. A client that sends `If-Match` with the ETag it last read
 * gets 412 `precondition_failed` when the row changed since; without the header an update behaves
 * as before (clients opt in with BE-10).
 */

export const preconditionFailed = (): PreconditionFailedException =>
  new PreconditionFailedException({
    code: "precondition_failed",
    message: "This was changed somewhere else since you loaded it. Reload it and try again.",
  });

/**
 * The version an `If-Match` header asks for: undefined when there is no header, else the date. A
 * value that is not one of this API's ETags can never match, so it is a 412 straight away.
 */
export function expectedVersion(ifMatch: string | string[] | undefined): Date | undefined {
  const value = Array.isArray(ifMatch) ? ifMatch.join(",") : ifMatch;
  if (value === undefined || value.trim() === "") return undefined;
  const date = parseEtag(value);
  if (!date) throw preconditionFailed();
  return date;
}

interface HeaderSink {
  setHeader(name: string, value: string): unknown;
}

/** Sets the ETag header from a row's `updatedAt` (no-op without a response, as in unit tests). */
export function setEtag(res: HeaderSink | undefined, updatedAt: Date | string | undefined): void {
  if (!res || updatedAt === undefined || updatedAt === null) return;
  const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
  if (!Number.isNaN(date.getTime())) res.setHeader(ETAG_HEADER, etagFor(date));
}

/**
 * Compare-and-set on the row's version, atomically: bumps `updated_at` only when the row matching
 * `where` (always including the owner's user id) still has the expected version, at the
 * millisecond precision the ETag carries. Inside a transaction the bumped row stays locked until
 * commit, so a concurrent update with the same ETag waits, re-checks and finds it stale.
 *
 * Returns `updated` when the version matched, `stale` when the row exists with another version
 * and `missing` when no row matches `where` at all (the caller's usual 404).
 */
export async function claimVersion<T extends ObjectLiteral>(
  repository: Repository<T>,
  where: Record<string, string>,
  expected: Date,
): Promise<"updated" | "stale" | "missing"> {
  const conditions = Object.keys(where).map((column) => `"${column}" = :${column}`);
  const result = await repository
    .createQueryBuilder()
    .update()
    // `updated_at` is `timestamptz` (BE-08), so the comparison is between instants and holds
    // whatever the session TimeZone is.
    .set({ updatedAt: () => "now()" } as never)
    .where(
      [
        ...conditions,
        `date_trunc('milliseconds', "updated_at") = CAST(:expectedVersion AS timestamptz)`,
      ].join(" AND "),
      { ...where, expectedVersion: expected.toISOString() },
    )
    .execute();
  if ((result.affected ?? 0) > 0) return "updated";
  const count = await repository
    .createQueryBuilder("t")
    .where(conditions.map((c) => `"t".${c}`).join(" AND "), where)
    .getCount();
  return count > 0 ? "stale" : "missing";
}

/**
 * Runs an update under an optional version claim. Without `expected` it runs `work` on
 * `repository` as before. With it, it opens a transaction, claims the version (404 via `notFound`
 * when no row matches, 412 when stale) and runs `work` on the transaction's repository, so the
 * read, the write and the claim commit together and the row stays locked in between.
 */
export async function withVersionClaim<T extends ObjectLiteral, R>(
  repository: Repository<T>,
  where: Record<string, string>,
  expected: Date | undefined,
  notFound: () => Error,
  work: (repository: Repository<T>) => Promise<R>,
): Promise<R> {
  if (!expected) return work(repository);
  return repository.manager.transaction(async (em) => {
    const scoped = em.getRepository<T>(repository.target);
    const claim = await claimVersion(scoped, where, expected);
    if (claim === "missing") throw notFound();
    if (claim === "stale") throw preconditionFailed();
    return work(scoped);
  });
}
