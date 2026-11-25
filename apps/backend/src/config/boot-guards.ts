import { hasBetaAdmins, isBetaOpen, isBetaRestricted } from "../auth/beta-access";
import { isProductionLike } from "../auth/mcp-access";
import { type BackendEnv, isProduction, parseBackendEnv } from "./env.schema";
import {
  HOUSEHOLD_LAUNCH_CONDITIONS,
  HOUSEHOLD_LAUNCH_CONDITIONS_MET,
  isHouseholdEnabled,
} from "./household-gate";
import { BANK_LAUNCH_GATE_PASSED } from "./launch-gate";

type Raw = Record<string, string | undefined>;

/**
 * A production-like process (NODE_ENV=production or Railway, `isProductionLike`) with no beta
 * allow-list, no beta admin and no `BETA_OPEN=true` (M12, D8).
 */
export class OpenBetaNotConfirmedError extends Error {
  override readonly name = "OpenBetaNotConfirmedError";
  constructor() {
    super(
      "Production and Railway need BETA_ADMIN_USER_IDS (invite links), BETA_ALLOWED_EMAILS or BETA_ALLOWED_USER_IDS, or BETA_OPEN=true to open the beta to every sign-up",
    );
  }
}

/** Production with CONTRACT_MODE set to anything other than enforce (M6). */
export class ContractModeNotEnforcedError extends Error {
  override readonly name = "ContractModeNotEnforcedError";
  constructor() {
    super("CONTRACT_MODE must be enforce (or unset) in production");
  }
}

/** `BANK_CONNECTIONS_ENABLED=true` before the bank launch gate has passed (BE-12). */
export class BankLaunchGateError extends Error {
  override readonly name = "BankLaunchGateError";
  constructor() {
    super(
      "BANK_CONNECTIONS_ENABLED=true is refused until the bank launch gate passes (BANK_LAUNCH_GATE_PASSED in config/launch-gate.ts); the owner allow-list still works",
    );
  }
}

/**
 * `HOUSEHOLD_ENABLED=true` in a production-like process before the owner has recorded the three
 * launch conditions (E34 C3, config/household-gate.ts). Only the owner turns households on.
 */
export class HouseholdGateError extends Error {
  override readonly name = "HouseholdGateError";
  constructor() {
    super(
      `HOUSEHOLD_ENABLED set to true is refused in production and on Railway until HOUSEHOLD_LAUNCH_CONDITIONS_MET in config/household-gate.ts is true. Only the owner sets it, once these exist: ${HOUSEHOLD_LAUNCH_CONDITIONS.join("; ")}`,
    );
  }
}

export interface BootGuardOptions {
  /** Injected so tests can prove the gate opens; production always uses the constant. */
  bankLaunchGatePassed?: boolean;
  /** Injected so tests can prove the household gate opens; production always uses the constant. */
  householdConditionsMet?: boolean;
}

/** Throws the first guard that fails. Each message names variables only, never values. */
export function assertBootGuards(env: Raw, options: BootGuardOptions = {}): void {
  const gatePassed = options.bankLaunchGatePassed ?? BANK_LAUNCH_GATE_PASSED;
  if (env.BANK_CONNECTIONS_ENABLED?.trim().toLowerCase() === "true" && !gatePassed) {
    throw new BankLaunchGateError();
  }
  const householdMet = options.householdConditionsMet ?? HOUSEHOLD_LAUNCH_CONDITIONS_MET;
  if (isProductionLike(env) && isHouseholdEnabled(env) && !householdMet) {
    throw new HouseholdGateError();
  }
  // The same production-like test the open-beta rule uses (isBetaInviteOnly), so a deployment
  // can never boot into the local "open with no variables" branch: NODE_ENV=production or Railway.
  if (isProductionLike(env) && !isBetaRestricted(env) && !hasBetaAdmins(env) && !isBetaOpen(env)) {
    throw new OpenBetaNotConfirmedError();
  }
  if (!isProduction(env)) return;
  const mode = env.CONTRACT_MODE?.trim().toLowerCase();
  if (mode && mode !== "enforce") throw new ContractModeNotEnforcedError();
}

/**
 * The single boot check, run by main.ts before Nest starts: the schema first (every malformed or
 * missing variable in one EnvValidationError), then the guards. Returns the typed environment.
 */
export function validateBootEnv(env: Raw, options: BootGuardOptions = {}): BackendEnv {
  const parsed = parseBackendEnv(env);
  assertBootGuards(env, options);
  return parsed;
}
