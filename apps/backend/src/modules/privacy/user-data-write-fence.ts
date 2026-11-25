import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import {
  type BeforeQueryEvent,
  DataSource,
  type EntitySubscriberInterface,
  type QueryRunner,
  type TransactionCommitEvent,
  type TransactionRollbackEvent,
  type TransactionStartEvent,
} from "typeorm";
import { accountDeletedException } from "../../auth/recent-login";
import { AccountDeletionService } from "./account-deletion.service";
import {
  type FencedRequest,
  fencedRequest,
  lockUserDataShared,
  runAsUserRequest,
  tryLockUserDataShared,
} from "./user-data-lock";
import { USER_DATA_REGISTRY, USER_LINKED_TABLES } from "./user-data-registry";

/** A write refused because an erasure or reset of the same user is running: try again shortly. */
const userDataBusyException = () =>
  new ServiceUnavailableException({
    code: "service_unavailable",
    message: "The service is busy. Please try again shortly.",
  });

/**
 * Privacy finding F1 (verify-account-erasure skill): a request that passed the AuthGuard just before
 * the erasure's tombstone committed could commit an insert after the erasure had finished. The row
 * stayed, and the guard then refused the user, so nothing reached it.
 *
 * The fence closes that: every transaction a signed-in request opens takes lockUserData in shared
 * mode as its first statement and checks the tombstone inside the lock, before any write.
 * - A write that holds the lock first commits before the erasure can take the exclusive lock, so the
 *   erasure's sweep deletes it.
 * - A write that starts while the erasure holds or waits for the lock is refused at once with 503,
 *   and one that starts after it committed sees the tombstone and is refused with 410.
 * Shared, so a user's own requests never wait for each other; only an erasure or reset waits.
 */

/**
 * Query runners whose current transaction holds the fence, with the request it counts against. Not
 * `queryRunner.data`: TypeORM swaps that object during a save with options.
 */
const fenced = new WeakMap<QueryRunner, FencedRequest>();

/** Ends the fence of a runner whose transaction has ended. */
function release(runner: QueryRunner): void {
  const request = fenced.get(runner);
  if (!request || runner.isTransactionActive) return;
  request.held -= 1;
  fenced.delete(runner);
}

/** Puts the signed-in user (set by the AuthGuard) around the handler, for UserDataWriteFence. */
@Injectable()
export class UserDataWriteFenceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();
    const userId = context.switchToHttp().getRequest<{ user?: { id?: unknown } }>()?.user?.id;
    if (typeof userId !== "string" || userId.length === 0) return next.handle();
    // Subscribing inside the store runs the handler, and every promise it creates, in it.
    return new Observable((subscriber) =>
      runAsUserRequest(userId, () => next.handle().subscribe(subscriber)),
    );
  }
}

const INSERT_INTO = /\b(?:INSERT|MERGE)\s+INTO\s+(?:"?public"?\.)?"?([A-Za-z0-9_]+)"?/i;

/** The table an INSERT or MERGE writes to (also inside a WITH), or null for any other statement. */
function insertTarget(sql: string): string | null {
  if (!/^\s*(INSERT|MERGE|WITH)\b/i.test(sql)) return null;
  return INSERT_INTO.exec(sql)?.[1] ?? null;
}

const UPDATE_SET =
  /\bUPDATE\s+(?:ONLY\s+)?(?:"?public"?\.)?"?([A-Za-z0-9_]+)"?(?:\s+(?:AS\s+)?"?\w+"?)?\s+SET\s+([\s\S]*)$/i;

/** Drops comments, then every parenthesised part (subqueries, function calls), innermost first. */
function flatten(sql: string): string {
  let out = sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
  for (let prev = ""; prev !== out; ) {
    prev = out;
    out = out.replace(/\([^()]*\)/g, " ");
  }
  return out;
}

/**
 * The table an UPDATE writes to (also inside a WITH, or after a comment) and its SET list, or null
 * for any other statement. The SET list ends at the first top-level FROM, WHERE or RETURNING, so a
 * subquery in a SET value does not end it early and a WHERE on the user column does not count.
 */
function updateTarget(sql: string): { table: string; set: string } | null {
  const flat = flatten(sql);
  if (!/^\s*(UPDATE|WITH)\b/i.test(flat)) return null;
  const m = UPDATE_SET.exec(flat);
  if (!m?.[1] || m[2] === undefined) return null;
  return { table: m[1], set: m[2].split(/\b(?:FROM|WHERE|RETURNING)\b/i)[0] ?? "" };
}

/** True when a SET list assigns `column` (quoted or not, with or without an alias). */
function assigns(set: string, column: string): boolean {
  // The SET list is flat (no parentheses, see flatten), so its assignments split on commas. Plain
  // string work, no pattern built from the column name.
  return set.split(",").some((assignment) => {
    const target = assignment.split("=")[0]?.trim() ?? "";
    const name = target.slice(target.lastIndexOf(".") + 1).replaceAll('"', "");
    return assignment.includes("=") && name.toLowerCase() === column.toLowerCase();
  });
}

/** Takes the fence in every transaction of a signed-in request (see the comment at the top). */
@Injectable()
export class UserDataWriteFence implements EntitySubscriberInterface {
  private userTables: Set<string> | null = null;
  private userColumns: Map<string, string> | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly deletion: AccountDeletionService,
  ) {
    dataSource.subscribers.push(this);
  }

  async afterTransactionStart(event: TransactionStartEvent): Promise<void> {
    const request = fencedRequest();
    const runner = event.queryRunner;
    // A savepoint inside a fenced transaction is already covered.
    if (!request || fenced.has(runner)) return;
    const { userId } = request;
    // First statements of the transaction, before any row lock. No wait: the lock is busy only while
    // an erasure or reset of this user holds or waits for it (up to 30 s, lockUserData). Waiting
    // would hold a pooled connection per write for that time, and a user could fill the pool by
    // writing during their own reset; and a request whose other transaction holds the lock would
    // wait on itself. So the write is refused with 503 (try again); after an erasure the retry
    // meets the AuthGuard's 410. A write that should survive a short reset (the /mcp audit row) waits
    // instead, up to the pool's lock_timeout (runAsUserRequest's waitForLock).
    try {
      if (request.waitForLock) {
        await lockUserDataShared(runner.manager, userId);
      } else if (!(await tryLockUserDataShared(runner.manager, userId))) {
        throw userDataBusyException();
      }
      if (await this.deletion.isErasedForWrite(userId, runner.manager)) {
        throw accountDeletedException();
      }
    } catch (err) {
      // Roll back here, which frees the lock: not every TypeORM caller rolls back when
      // startTransaction throws (query builders with useTransaction do not). A later rollback by
      // the caller then fails with "not started", which TypeORM ignores.
      await runner.rollbackTransaction().catch(() => undefined);
      throw err;
    }
    fenced.set(runner, request);
    request.held += 1;
  }

  afterTransactionCommit(event: TransactionCommitEvent): void {
    release(event.queryRunner);
  }

  afterTransactionRollback(event: TransactionRollbackEvent): void {
    release(event.queryRunner);
  }

  /**
   * An insert outside a transaction cannot hold the lock until it commits, so in a signed-in
   * request it is refused: wrap it in a transaction. So is an update that sets a table's user column
   * (a beta invite's redeemer, a row's user_id): it can relink a row the erasure blanked or moved
   * past. Other updates and deletes are allowed outside one (the last-active stamp, an idempotency
   * key's result): an update cannot bring back a deleted row, and a delete only removes.
   */
  beforeQuery(event: BeforeQueryEvent): void {
    if (fencedRequest() === null || event.queryRunner.isTransactionActive) return;
    const table = insertTarget(event.query);
    if (table && this.tables().has(table)) {
      throw new Error(`Insert into ${table} outside a transaction in a signed-in request`);
    }
    const update = updateTarget(event.query);
    const column = update ? this.columns().get(update.table) : undefined;
    if (update && column && assigns(update.set, column)) {
      throw new Error(
        `Update of ${update.table}.${column} outside a transaction in a signed-in request`,
      );
    }
  }

  private tables(): Set<string> {
    this.userTables ??= new Set(this.columns().keys());
    return this.userTables;
  }

  /** Each user table and the column that holds the user's id. */
  private columns(): Map<string, string> {
    this.userColumns ??= new Map(
      [
        ...USER_DATA_REGISTRY.map((t) => ({ entity: t.entity, property: "userId" })),
        ...USER_LINKED_TABLES.map((t) => ({ entity: t.entity, property: t.userColumn })),
      ].map(({ entity, property }) => {
        const metadata = this.dataSource.getMetadata(entity);
        const column = metadata.findColumnWithPropertyName(property);
        if (!column) throw new Error(`${metadata.tableName} has no ${property} column`);
        return [metadata.tableName, column.databaseName];
      }),
    );
    return this.userColumns;
  }
}
