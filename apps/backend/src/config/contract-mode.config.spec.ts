import { CONTRACT_GROUPS } from "@flump/api-contract";
import { describe, expect, it } from "vitest";
import { assertContractModeForEnv } from "./contract-mode.config";

const prod = (extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: "production",
  ...extra,
});

describe("assertContractModeForEnv", () => {
  it("boots in production when the contract is enforced (unset, enforce, all groups)", () => {
    expect(() => assertContractModeForEnv(prod())).not.toThrow();
    expect(() => assertContractModeForEnv(prod({ CONTRACT_MODE: "enforce" }))).not.toThrow();
    expect(() => assertContractModeForEnv(prod({ CONTRACT_MODE: " Enforce " }))).not.toThrow();
    expect(() => assertContractModeForEnv(prod({ CONTRACT_ENFORCE_GROUPS: "all" }))).not.toThrow();
    expect(() =>
      assertContractModeForEnv(prod({ CONTRACT_ENFORCE_GROUPS: CONTRACT_GROUPS.join(",") })),
    ).not.toThrow();
  });

  it.each(["shadow", "off", "enforce-ish"])(
    "refuses to boot in production with CONTRACT_MODE=%s",
    (mode) => {
      expect(() => assertContractModeForEnv(prod({ CONTRACT_MODE: mode }))).toThrow(
        /CONTRACT_MODE must be "enforce"/,
      );
    },
  );

  it("refuses to boot in production when only some groups are enforced", () => {
    expect(() => assertContractModeForEnv(prod({ CONTRACT_ENFORCE_GROUPS: "accounts" }))).toThrow(
      /CONTRACT_ENFORCE_GROUPS/,
    );
  });

  it("leaves the escape hatches open outside production", () => {
    for (const NODE_ENV of ["development", "test", undefined]) {
      expect(() =>
        assertContractModeForEnv({
          NODE_ENV,
          CONTRACT_MODE: "shadow",
          CONTRACT_ENFORCE_GROUPS: "accounts",
        }),
      ).not.toThrow();
    }
  });
});
