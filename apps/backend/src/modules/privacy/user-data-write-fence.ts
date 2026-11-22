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
import { fencedUserId, lockUserDataShared, runAsUserRequest } from "./user-data-lock";
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
 * Query runners whose current transaction already holds the fence. Not `queryRunner.data`: TypeORM
 * swaps that object during a save with options.
 */
const fenced = new WeakSet<QueryRunner>();

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

/** The table an INSERT statement writes to, or null for any other statement. */
export function insertTarget(sql: string): string | null {
  const match = /^\s*INSERT\s+INTO\s+(?:"?public"?\.)?"?([A-Za-z0-9_]+)"?/i.exec(sql);
  return match?.[1] ?? null;
}

/** Takes the fence in every transaction of a signed-in request (see the comment at the top). */
@Injectable()
export class UserDataWriteFence implements EntitySubscriberInterface {
  private userTables: Set<string> | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly deletion: AccountDeletionService,
  ) {
    dataSource.subscribers.push(this);
  }

  async afterTransactionStart(event: TransactionStartEvent): Promise<void> {
    const userId = fencedUserId();
    const runner = event.queryRunner;
    // A savepoint inside a fenced transaction is already covered.
    if (!userId || fenced.has(runner)) return;
    // First statements of the transaction, so it holds no row lock while it waits.
    await lockUserDataShared(runner.manager, userId);
    if (await this.deletion.isErasedForWrite(userId, runner.manager)) {
      // Thrown after START TRANSACTION: the caller rolls back, which frees the lock.
      throw accountDeletedException();
    }
    fenced.add(runner);
  }

  afterTransactionCommit(event: TransactionCommitEvent): void {
    if (!event.queryRunner.isTransactionActive) fenced.delete(event.queryRunner);
  }

  afterTransactionRollback(event: TransactionRollbackEvent): void {
    if (!event.queryRunner.isTransactionActive) fenced.delete(event.queryRunner);
  }

  /**
   * An insert outside a transaction cannot hold the lock until it commits, so in a signed-in
   * request it is refused: wrap it in a transaction. Updates and deletes cannot bring back a row
   * the erasure removed, so they are not checked.
   */
  beforeQuery(event: BeforeQueryEvent): void {
    if (fencedUserId() === null || event.queryRunner.isTransactionActive) return;
    const table = insertTarget(event.query);
    if (table && this.tables().has(table)) {
      throw new Error(`Insert into ${table} outside a transaction in a signed-in request`);
    }
  }

  private tables(): Set<string> {
    this.userTables ??= new Set(
      [...USER_DATA_REGISTRY, ...USER_LINKED_TABLES].map(
        (t) => this.dataSource.getMetadata(t.entity).tableName,
      ),
    );
    return this.userTables;
  }
}
