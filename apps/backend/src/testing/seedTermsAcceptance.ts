import type { DataSource } from "typeorm";
import { TermsAcceptance } from "../entities/terms-acceptance.entity";
import { newestPair } from "../modules/profile/terms-acceptance.service";

/**
 * Test helper: records that these users agreed to the newest terms (with the newest privacy notice
 * shown), as the web acceptance screen would. Suites that exercise routes other than terms
 * acceptance call it so the AuthGuard's terms check lets their users through; suites about terms
 * acceptance itself leave a user without a row. Idempotent.
 */
export async function seedTermsAcceptance(
  dataSource: DataSource,
  userIds: readonly string[],
): Promise<void> {
  const pair = newestPair();
  await dataSource
    .createQueryBuilder()
    .insert()
    .into(TermsAcceptance)
    .values(
      userIds.map((userId) => ({
        userId,
        termsVersionAgreed: pair.termsVersion,
        privacyNoticeVersionShown: pair.privacyNoticeVersion,
      })),
    )
    .orIgnore()
    .execute();
}
