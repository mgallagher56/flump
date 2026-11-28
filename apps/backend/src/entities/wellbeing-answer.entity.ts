import { Check, Column, Entity, PrimaryColumn } from "typeorm";

/**
 * The answer to the two optional questions after a check-in (E35 W5), at most one row per person
 * per calendar quarter (Europe/London). Both answers null records a skip. Kept as small as it can
 * be: no id and no timestamps. `worse_text` is free text that may be sensitive: it is never logged,
 * never sent to Sentry and never read by an MCP tool. Rows go 13 months after the quarter's first
 * day (jobs/retention.ts). The questions were removed on 28 Nov 2026: nothing adds rows now.
 */
@Entity("wellbeing_answers")
@Check(
  "CHK_wellbeing_answers_feeling",
  `"feeling" IS NULL OR "feeling" IN ('more_in_control', 'about_the_same', 'more_worried')`,
)
export class WellbeingAnswer {
  @PrimaryColumn({ name: "user_id" })
  userId: string;

  /** The first day of the quarter, YYYY-MM-DD. */
  @PrimaryColumn({ type: "date" })
  quarter: string;

  @Column({ type: "varchar", length: 16, nullable: true })
  feeling: string | null;

  @Column({ name: "worse_text", type: "varchar", length: 1000, nullable: true })
  worseText: string | null;
}
