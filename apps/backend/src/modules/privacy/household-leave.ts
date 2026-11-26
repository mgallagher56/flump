import type { EntityManager } from "typeorm";

/** `query()` gives `[rows, count]` for DELETE. */
const affectedOf = (result: unknown): number =>
  Array.isArray(result) && typeof result[1] === "number" ? result[1] : 0;

/**
 * Takes a person out of their household (E34 C3): deletes the household itself, so the database's
 * ON DELETE CASCADE removes both member rows, and deletes the person's own open invitation link.
 * Nothing else changes: each person's accounts were always their own rows (G7), and the other
 * person loses only their membership row.
 *
 * The one leave function, used by POST /household/leave (HouseholdService.leave) and by account
 * erasure (AccountDeletionService, before its sweep). It lives in the privacy module so the erasure
 * can call it without the privacy module depending on the household module. Safe to repeat: with
 * nothing to leave it deletes nothing. It writes no audit event and sends nothing (CD6, G5).
 * Run it inside a transaction that holds the person's user-data lock (shared or exclusive).
 */
export async function leaveHousehold(
  manager: EntityManager,
  userId: string,
): Promise<{ households: number; invitations: number }> {
  const households = affectedOf(
    await manager.query(
      `DELETE FROM "households"
       WHERE "id" IN (SELECT "household_id" FROM "household_members" WHERE "user_id" = $1)`,
      [userId],
    ),
  );
  const invitations = affectedOf(
    await manager.query(`DELETE FROM "household_invitations" WHERE "inviter_user_id" = $1`, [
      userId,
    ]),
  );
  return { households, invitations };
}
