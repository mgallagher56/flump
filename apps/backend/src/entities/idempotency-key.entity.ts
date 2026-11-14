import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

/**
 * A stored create result for the `Idempotency-Key` header (BE-09, audit M7). One row per user,
 * route and key. A row with a null `status_code` is a request still in flight. Rows older than
 * IDEMPOTENCY_KEY_TTL_HOURS are treated as absent and deleted per user on that user's next claim;
 * a sweep of users who never return is left to the BE-06 retention work (the `created_at` index
 * serves it). A financial data reset deletes the user's rows. There is no users table to cascade
 * from, so account deletion (BE-04) must delete them by user_id.
 * AddIdempotencyKeysAndAccountVersion1794632100000.
 */
@Entity("idempotency_keys")
@Unique("UQ_idempotency_keys_user_route_key", ["userId", "routeId", "key"])
@Index("IDX_idempotency_keys_created", ["createdAt"])
export class IdempotencyKey {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "varchar" })
  userId: string;

  /** The manifest route id, for example `accounts.create`. */
  @Column({ name: "route_id", type: "varchar", length: 64 })
  routeId: string;

  @Column({ type: "varchar", length: 255 })
  key: string;

  /** SHA-256 (hex) of the canonical JSON of the parsed request body. */
  @Column({ name: "request_hash", type: "char", length: 64 })
  requestHash: string;

  /** The stored success status; null while the first request is still running. */
  @Column({ name: "status_code", type: "smallint", nullable: true })
  statusCode: number | null;

  /** The stored success body as the client received it; null while in flight. */
  @Column({ name: "response_body", type: "jsonb", nullable: true })
  responseBody: unknown;

  /** The replayed response headers (ETag, Location) the handler set; null while in flight. */
  @Column({ name: "response_headers", type: "jsonb", nullable: true })
  responseHeaders: Record<string, string> | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
