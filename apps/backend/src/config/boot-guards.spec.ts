import { describe, expect, it } from "vitest";
import {
  assertBootGuards,
  BankLaunchGateError,
  ContractModeNotEnforcedError,
  HouseholdGateError,
  OpenBetaNotConfirmedError,
  validateBootEnv,
} from "./boot-guards";
import { EnvValidationError } from "./env.schema";
import { HOUSEHOLD_LAUNCH_CONDITIONS_MET, isHouseholdEnabled } from "./household-gate";
import { BANK_LAUNCH_GATE_PASSED } from "./launch-gate";

const PROD = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://u:p@db.internal:5432/flump",
  CORS_ALLOWED_ORIGINS: "https://app.example.invalid",
  MCP_AUDIT_HMAC_KEY: "k".repeat(32),
  DELETION_TOMBSTONE_KEY: "t".repeat(32),
  WEB_CLIENT_IP_HMAC_KEY: "h".repeat(32),
  WORKOS_API_KEY: "w".repeat(32),
  WORKOS_CLIENT_ID: "client_123",
  BANKING_TOKEN_ENCRYPTION_KEY: "b".repeat(64),
  RECEIPT_ENCRYPTION_KEY: "r".repeat(64),
  BETA_ALLOWED_USER_IDS: "user_01",
};

describe("open beta guard (M12, D8)", () => {
  it("refuses production with neither allow-list, no beta admin and no BETA_OPEN", () => {
    const env = { ...PROD, BETA_ALLOWED_USER_IDS: undefined };
    expect(() => assertBootGuards(env)).toThrow(OpenBetaNotConfirmedError);
    expect(() => assertBootGuards({ ...env, BETA_OPEN: "false" })).toThrow(
      OpenBetaNotConfirmedError,
    );
    // An admin list of only separators names nobody.
    expect(() => assertBootGuards({ ...env, BETA_ADMIN_USER_IDS: " , " })).toThrow(
      OpenBetaNotConfirmedError,
    );
  });

  it("refuses a Railway process with nothing set, whatever NODE_ENV says", () => {
    for (const NODE_ENV of ["development", "test", undefined]) {
      expect(() => assertBootGuards({ NODE_ENV, RAILWAY_ENVIRONMENT: "staging" })).toThrow(
        OpenBetaNotConfirmedError,
      );
    }
    expect(() =>
      assertBootGuards({
        NODE_ENV: "development",
        RAILWAY_ENVIRONMENT: "staging",
        BETA_OPEN: "true",
      }),
    ).not.toThrow();
  });

  it("allows production with only BETA_ADMIN_USER_IDS (invite links)", () => {
    expect(() =>
      assertBootGuards({
        ...PROD,
        BETA_ALLOWED_USER_IDS: undefined,
        BETA_ADMIN_USER_IDS: "user_01",
      }),
    ).not.toThrow();
  });

  it("allows production with either allow-list, or BETA_OPEN=true", () => {
    expect(() => assertBootGuards(PROD)).not.toThrow();
    expect(() =>
      assertBootGuards({ ...PROD, BETA_ALLOWED_USER_IDS: undefined, BETA_ALLOWED_EMAILS: "a@b.c" }),
    ).not.toThrow();
    expect(() =>
      assertBootGuards({ ...PROD, BETA_ALLOWED_USER_IDS: undefined, BETA_OPEN: "TRUE" }),
    ).not.toThrow();
  });

  it("does not apply outside production", () => {
    expect(() => assertBootGuards({ NODE_ENV: "development" })).not.toThrow();
    expect(() => assertBootGuards({ NODE_ENV: "test" })).not.toThrow();
  });

  it("names the variables, with a stable error name", () => {
    const error = new OpenBetaNotConfirmedError();
    expect(error.name).toBe("OpenBetaNotConfirmedError");
    expect(error.message).toContain("BETA_OPEN=true");
    expect(error.message).toContain("BETA_ADMIN_USER_IDS");
  });
});

describe("contract mode guard (M6)", () => {
  it.each(["shadow", "off", "OFF"])("refuses CONTRACT_MODE=%s in production", (mode) => {
    expect(() => assertBootGuards({ ...PROD, CONTRACT_MODE: mode })).toThrow(
      ContractModeNotEnforcedError,
    );
  });

  it("allows enforce or unset in production, and anything outside it", () => {
    expect(() => assertBootGuards({ ...PROD, CONTRACT_MODE: "enforce" })).not.toThrow();
    expect(() => assertBootGuards(PROD)).not.toThrow();
    expect(() =>
      assertBootGuards({ NODE_ENV: "development", CONTRACT_MODE: "shadow" }),
    ).not.toThrow();
  });
});

describe("bank launch gate guard", () => {
  it("is closed until BE-12 flips it", () => {
    expect(BANK_LAUNCH_GATE_PASSED).toBe(false);
  });

  it.each(["development", "test", "production"])(
    "refuses BANK_CONNECTIONS_ENABLED=true in %s while the gate is closed",
    (nodeEnv) => {
      expect(() =>
        assertBootGuards({ ...PROD, NODE_ENV: nodeEnv, BANK_CONNECTIONS_ENABLED: " True " }),
      ).toThrow(BankLaunchGateError);
    },
  );

  it("allows the flag once the gate passes, and false or unset always", () => {
    expect(() =>
      assertBootGuards(
        { ...PROD, BANK_CONNECTIONS_ENABLED: "true" },
        { bankLaunchGatePassed: true },
      ),
    ).not.toThrow();
    expect(() => assertBootGuards({ ...PROD, BANK_CONNECTIONS_ENABLED: "false" })).not.toThrow();
    expect(() =>
      assertBootGuards({ ...PROD, BANK_CONNECTIONS_ALLOWED_USER_IDS: "user_01" }),
    ).not.toThrow();
  });

  it("has a stable error name", () => {
    expect(new BankLaunchGateError().name).toBe("BankLaunchGateError");
  });
});

describe("household gate guard (E34 C3)", () => {
  it("is closed until the owner records the three launch conditions", () => {
    expect(HOUSEHOLD_LAUNCH_CONDITIONS_MET).toBe(false);
  });

  it("is off unless the variable is exactly true", () => {
    expect(isHouseholdEnabled({})).toBe(false);
    for (const value of ["", "false", "1", "yes", "on", "truthy"]) {
      expect(isHouseholdEnabled({ HOUSEHOLD_ENABLED: value })).toBe(false);
    }
    expect(isHouseholdEnabled({ HOUSEHOLD_ENABLED: " True " })).toBe(true);
  });

  it("refuses HOUSEHOLD_ENABLED=true in production while the conditions are not met", () => {
    expect(() => assertBootGuards({ ...PROD, HOUSEHOLD_ENABLED: "true" })).toThrow(
      HouseholdGateError,
    );
  });

  it("refuses it on Railway whatever NODE_ENV says", () => {
    expect(() =>
      assertBootGuards({
        ...PROD,
        NODE_ENV: "development",
        RAILWAY_ENVIRONMENT: "production",
        HOUSEHOLD_ENABLED: "TRUE",
      }),
    ).toThrow(HouseholdGateError);
  });

  it("allows it in a local process, for the disposable test stack", () => {
    expect(() =>
      assertBootGuards({ NODE_ENV: "development", HOUSEHOLD_ENABLED: "true" }),
    ).not.toThrow();
  });

  it("allows it in production once the conditions are met, and off always", () => {
    expect(() =>
      assertBootGuards({ ...PROD, HOUSEHOLD_ENABLED: "true" }, { householdConditionsMet: true }),
    ).not.toThrow();
    expect(() => assertBootGuards({ ...PROD, HOUSEHOLD_ENABLED: "false" })).not.toThrow();
    expect(() => assertBootGuards(PROD)).not.toThrow();
  });

  it("names the three conditions and the owner, with a stable error name", () => {
    const error = new HouseholdGateError();
    expect(error.name).toBe("HouseholdGateError");
    expect(error.message).toContain("CD7");
    expect(error.message).toContain("DPIA");
    expect(error.message).toContain("CD10");
    expect(error.message).toContain("Only the owner");
  });
});

describe("validateBootEnv", () => {
  it("runs the schema before the guards and returns the typed environment", () => {
    expect(() => validateBootEnv({ ...PROD, CORS_ALLOWED_ORIGINS: undefined })).toThrow(
      EnvValidationError,
    );
    const env = validateBootEnv({ ...PROD, PORT: "4001" });
    expect(env.PORT).toBe(4001);
  });

  it("throws the guard error for a valid but unsafe environment", () => {
    expect(() => validateBootEnv({ ...PROD, CONTRACT_MODE: "off" })).toThrow(
      ContractModeNotEnforcedError,
    );
  });
});
