import { isBetaOpen, isBetaRestricted } from "../auth/beta-access";
import { type BackendEnv, isProduction, parseBackendEnv } from "./env.schema";
import { BANK_LAUNCH_GATE_PASSED } from "./launch-gate";

type Raw = Record<string, string | undefined>;

/** Production with no beta allow-list and no `BETA_OPEN=true` (M12, D8). */
export class OpenBetaNotConfirmedError extends Error {
  override readonly name = "OpenBetaNotConfirmedError";
  constructor() {
    super(
      "Production needs BETA_ALLOWED_EMAILS or BETA_ALLOWED_USER_IDS, or BETA_OPEN=true to open the beta to every sign-up",
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

export interface BootGuardOptions {
  /** Injected so tests can prove the gate opens; production always uses the constant. */
  bankLaunchGatePassed?: boolean;
}

/** Throws the first guard that fails. Each message names variables only, never values. */
export function assertBootGuards(env: Raw, options: BootGuardOptions = {}): void {
  const gatePassed = options.bankLaunchGatePassed ?? BANK_LAUNCH_GATE_PASSED;
  if (env.BANK_CONNECTIONS_ENABLED?.trim().toLowerCase() === "true" && !gatePassed) {
    throw new BankLaunchGateError();
  }
  if (!isProduction(env)) return;
  if (!isBetaRestricted(env) && !isBetaOpen(env)) throw new OpenBetaNotConfirmedError();
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
