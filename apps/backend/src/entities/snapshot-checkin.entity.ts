import { Check, Column, Entity, PrimaryColumn } from "typeorm";

/**
 * The user's monthly check-in for a month (E30 D9). Distinct from "values exist": a connected sync
 * can fill values without the user ever looking. `month` is "YYYY-MM" (Europe/London). The row is
 * written by the check-in's first saved balance, with `completedAt` empty (started, CH-3), and
 * `completedAt` is set when the user finishes it.
 */
@Entity("snapshot_checkins")
@Check("CHK_snapshot_checkins_month", `"month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`)
export class SnapshotCheckin {
  @PrimaryColumn({ name: "user_id" })
  userId: string;

  @PrimaryColumn()
  month: string;

  /** When the check-in was finished; null while it is started but not finished. */
  @Column({ name: "completed_at", type: "timestamptz", nullable: true, default: () => "now()" })
  completedAt: Date | null;
}
