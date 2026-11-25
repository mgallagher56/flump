import {
  AnswerWellbeingQuestionsRequest,
  type AnswerWellbeingQuestionsResponse,
  type WellbeingQuestionsStatusResponse,
} from "@flump/api-contract";
import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { londonQuarterStart } from "./london-date";

/** `WELLBEING_QUESTIONS_PAUSED=true` (env.schema.ts) stops the questions for everyone. */
export function wellbeingQuestionsPaused(raw: string | undefined): boolean {
  return raw?.trim().toLowerCase() === "true";
}

/**
 * The person's switch (`user_profiles.wellbeing_questions`, on by default, so a person with no
 * profile row yet counts as on). FOR SHARE makes a record wait for a switch-off that is in flight
 * and then read its result, so an answer can never be inserted after the switch-off deleted the
 * earlier ones.
 */
const SWITCH_ON = `COALESCE(
  (SELECT "wellbeing_questions" FROM "user_profiles" WHERE "user_id" = $1::varchar FOR SHARE), true)`;

/**
 * E35 W5: the two optional questions after a check-in, asked at most once per calendar quarter on
 * the London clock. The free text is personal data that may be sensitive: nothing here logs it,
 * and no error message carries it.
 */
@Injectable()
export class WellbeingQuestionsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  private paused(): boolean {
    return wellbeingQuestionsPaused(this.config.get<string>("WELLBEING_QUESTIONS_PAUSED"));
  }

  /** Due when not paused, the person's switch is on and nothing is recorded for this quarter. */
  async status(userId: string, now: Date = new Date()): Promise<WellbeingQuestionsStatusResponse> {
    if (this.paused()) return { due: false };
    const rows: Array<{ on: boolean; recorded: boolean }> = await this.dataSource.query(
      `SELECT COALESCE(
                (SELECT "wellbeing_questions" FROM "user_profiles" WHERE "user_id" = $1), true) AS "on",
              EXISTS (SELECT 1 FROM "wellbeing_answers" WHERE "user_id" = $1 AND "quarter" = $2)
                AS "recorded"`,
      [userId, londonQuarterStart(now)],
    );
    const row = rows[0];
    return { due: row?.on === true && row.recorded === false };
  }

  /**
   * Records the answer, or a skip (both null), for the current quarter. The first record of a
   * quarter stands: a repeat changes nothing and answers recorded:false, as does a record while the
   * questions are paused or switched off. Re-validated here, because the contract may run in
   * shadow mode; the 400 names the field, never the text.
   */
  async record(
    userId: string,
    body: unknown,
    now: Date = new Date(),
  ): Promise<AnswerWellbeingQuestionsResponse> {
    const parsed = AnswerWellbeingQuestionsRequest.safeParse(body);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      throw new BadRequestException(
        field === "feeling" || field === "worseText"
          ? `${field} is not a valid answer`
          : "the body must hold feeling and worseText",
      );
    }
    if (this.paused()) return { recorded: false };
    const { feeling } = parsed.data;
    // The contract trims; an empty answer is stored as null.
    const worseText = parsed.data.worseText ? parsed.data.worseText : null;
    const inserted: unknown[] = await this.dataSource.transaction((manager) =>
      manager.query(
        `INSERT INTO "wellbeing_answers" ("user_id", "quarter", "feeling", "worse_text")
         SELECT $1::varchar, $2::date, $3::varchar, $4::varchar WHERE ${SWITCH_ON}
         ON CONFLICT ("user_id", "quarter") DO NOTHING
         RETURNING 1 AS "inserted"`,
        [userId, londonQuarterStart(now), feeling, worseText],
      ),
    );
    return { recorded: inserted.length === 1 };
  }
}
