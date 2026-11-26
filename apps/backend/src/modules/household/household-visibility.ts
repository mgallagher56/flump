import type { EntityManager } from "typeorm";

/** One household member whose joint accounts the viewer may see in the summary. */
export interface JointSummarySourceMember {
  userId: string;
  addedBy: "you" | "other";
}

/**
 * Who the household joint summary may read from (E34 C3): the one place that decides it. Null when
 * the viewer is in no household. Otherwise the members of the viewer's own household who chose to
 * share their joint accounts, the viewer included when they share. Nobody outside the viewer's
 * household, and nobody who has not shared (CD1, G2, G3).
 */
export async function jointSummarySourceUserIds(
  manager: EntityManager,
  viewerId: string,
): Promise<{ householdId: string; members: JointSummarySourceMember[] } | null> {
  const rows: Array<{ household_id: string; user_id: string; shares_joint_summary: boolean }> =
    await manager.query(
      `SELECT m."household_id", m."user_id", m."shares_joint_summary"
       FROM "household_members" m
       WHERE m."household_id" = (
         SELECT v."household_id" FROM "household_members" v WHERE v."user_id" = $1
       )`,
      [viewerId],
    );
  const first = rows[0];
  if (!first) return null;
  return {
    householdId: first.household_id,
    members: rows
      .filter((r) => r.shares_joint_summary === true)
      .map((r) => ({ userId: r.user_id, addedBy: r.user_id === viewerId ? "you" : "other" })),
  };
}
