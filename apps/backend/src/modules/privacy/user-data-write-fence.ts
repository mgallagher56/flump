import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
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
} from "./user-data-lock";
import { USER_DATA_REGISTRY, USER_LINKED_TABLES } from "./user-data-registry";

/**
 * Privacy finding F1 (verify-account-erasure skill): a request that passed the AuthGuard just before
 * the erasure's tombstone committed could commit an insert after the erasure had finished. The row
 * stayed, and the guard then refused the user, so nothing reached it.
 *
 * The fence closes that: every transaction a signed-in request opens takes lockUserData in shared
 * mode as its first statement and checks the tombstone inside the lock, before any write.
 * - A write that holds the lock first commits before the erasure can take the exclusive lock, so the
 *   erasure's sweep deletes it.
 * - A write that starts while the erasure holds the lock waits for its commit, then sees the
 *   tombstone and is refused with 410.
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
  /^\s*UPDATE\s+(?:ONLY\s+)?(?:"?public"?\.)?"?([A-Za-z0-9_]+)"?(?:\s+(?:AS\s+)?"?\w+"?)?\s+SET\s+([\s\S]*?)(?:\bFROM\b|\bWHERE\b|\bRETURNING\b|$)/i;

/** The table an UPDATE writes to and its SET list, or null for any other statement. */
function updateTarget(sql: string): { table: string; set: string } | null {
  const m = UPDATE_SET.exec(sql);
  return m?.[1] && m[2] !== undefined ? { table: m[1], set: m[2] } : null;
}

/** True when a SET list assigns `column` (quoted or not, with or without an alias). */
function assigns(set: string, column: string): boolean {
  return new RegExp(`(?:^|[\\s,.])"?${column}"?\\s*=`, "i").test(set);
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
    // First statements of the transaction, so it holds no row lock while it waits. The session's
    // lock_timeout bounds the wait: a request whose transaction waits behind a queued erasure while
    // another of its own transactions holds the lock fails instead of hanging.
    try {
      await lockUserDataShared(runner.manager, userId);
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
