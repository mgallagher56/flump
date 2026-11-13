import { Check, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

/**
 * The user confirmed their balances for a month (E30 D9). Distinct from "values exist": a
 * connected sync can fill values without the user ever looking. `month` is "YYYY-MM"
 * (Europe/London).
 */
@Entity("snapshot_checkins")
@Check("CHK_snapshot_checkins_month", `"month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`)
export class SnapshotCheckin {
  @PrimaryColumn({ name: "user_id" })
  userId: string;

  @PrimaryColumn()
  month: string;

  @CreateDateColumn({ name: "completed_at" })
  completedAt: Date;
}
