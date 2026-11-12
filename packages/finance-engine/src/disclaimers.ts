/**
 * Canonical notice strings (E29-T7, E19 C5 slice). One source for every surface that must say
 * "guidance, not advice". Keep regulator wording out of this file: the claims guard bans it and
 * the owner writes regulatory-status copy (E7).
 */

/** Same text as `PROJECTION_NOTICE_TEXT` in `packages/ui` `ProjectionNotice.tsx` (E15 re-points it here). */
export const PROJECTION_NOTICE =
  "Guidance, not advice. Flump works from the figures you enter and shows estimates, which can differ from what happens in practice. It is not financial, tax, investment or debt advice.";

/** Carried by every MCP tool result (E17-N8 envelope, E29-T6 policy). */
export const MCP_NOTICE =
  "Calculations from figures held in Flump. Guidance, not advice. Unverified.";

/** Friends-beta notice (E19 C1 and C2 embed this). */
export const BETA_NOTICE =
  "Flump is a test service. It gives guidance and calculations, not advice. These terms are unreviewed.";

const regulatoryStatusError = (): never => {
  throw new Error(
    "REGULATORY_STATUS is a placeholder: regulatory-status wording is owner-only (E7). Do not render it.",
  );
};

/** Placeholder for regulatory-status wording. Any use throws, so it cannot ship by accident. */
export const REGULATORY_STATUS: string = new Proxy({} as object, {
  get: regulatoryStatusError,
  has: regulatoryStatusError,
  ownKeys: regulatoryStatusError,
  getPrototypeOf: regulatoryStatusError,
}) as unknown as string;
