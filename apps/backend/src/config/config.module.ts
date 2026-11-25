import type { ClientPolicyResponse } from "@flump/api-contract";
import {
  bankingKeyFormatWarningMessage,
  bankingKeyFormatWarnings,
  resolveBankingKey,
  resolveBankingKeyring,
} from "@flump/banking/server";
import { Global, Logger, Module } from "@nestjs/common";
import { readClientPolicy } from "./client-policy.config";
import { assertContractModeForEnv } from "./contract-mode.config";
import { type DbConfig, resolveDbConfig } from "./db.config";
import {
  type RetiredVariable,
  retiredVariableMessage,
  retiredVariablesSet,
} from "./privacy.config";

export const BOOT_CONFIG = "BOOT_CONFIG";

export interface BootConfig {
  db: DbConfig;
  /** GET /app/client-policy, resolved once at boot (N11) rather than from process.env per request. */
  clientPolicy: ClientPolicyResponse;
  /** Retired variables still set: logged at boot by name, counted by /health/ready. */
  configWarnings: readonly RetiredVariable[];
}

@Global()
@Module({
  providers: [
    {
      // Computed once; throws at boot (before listening) on invalid config.
      provide: BOOT_CONFIG,
      useFactory: (): BootConfig => {
        const db = resolveDbConfig(process.env);
        resolveBankingKey(process.env);
        resolveBankingKeyring(process.env);
        assertContractModeForEnv(process.env);
        const logger = new Logger("AppConfigModule");
        // E3 D-11: a working key that is not 32 generated random bytes is warned about, never
        // refused, so a key that boots today keeps booting. Variable and version only.
        for (const warning of bankingKeyFormatWarnings(process.env)) {
          logger.warn(bankingKeyFormatWarningMessage(warning));
        }
        for (const warning of db.warnings) {
          logger.warn(warning);
        }
        const configWarnings = retiredVariablesSet(process.env);
        for (const name of configWarnings) {
          logger.warn(retiredVariableMessage(name));
        }
        return { db, clientPolicy: readClientPolicy(process.env), configWarnings };
      },
    },
  ],
  exports: [BOOT_CONFIG],
})
export class AppConfigModule {}
