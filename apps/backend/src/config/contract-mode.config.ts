import { CONTRACT_GROUPS } from "@flump/api-contract";
import {
  resolveContractMode,
  resolveEnforcedGroups,
} from "../contract/contract-shadow.interceptor";

/**
 * Boot check (BE-09, M6): in production the request contract must be enforced, because handlers
 * trust the parsed contract output. `CONTRACT_MODE` must be unset or `enforce`, and every contract
 * group must be enforced (`CONTRACT_ENFORCE_GROUPS` unset with nothing held back, `all`, or a list
 * naming every group). Anything else refuses to boot. Outside
 * production the escape hatches (`shadow`, `off`, a group subset) stay available for local work.
 */
export function assertContractModeForEnv(env: NodeJS.ProcessEnv): void {
  if (env.NODE_ENV !== "production") return;
  const raw = env.CONTRACT_MODE?.trim().toLowerCase();
  if (raw && raw !== "enforce") {
    throw new Error(
      `CONTRACT_MODE must be "enforce" (or unset) in production, got "${env.CONTRACT_MODE}"`,
    );
  }
  // Belt and braces: the resolver must agree.
  if (resolveContractMode(env) !== "enforce") {
    throw new Error("CONTRACT_MODE must resolve to enforce in production");
  }
  const groups = resolveEnforcedGroups(env);
  if (groups !== "all" && CONTRACT_GROUPS.some((group) => !groups.has(group))) {
    throw new Error(
      'CONTRACT_ENFORCE_GROUPS must be "all" (or unset) in production, so every route is enforced',
    );
  }
}
