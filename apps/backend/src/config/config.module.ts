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
  type PrivacyProductionVariable,
  privacyConfigWarnings,
  privacyWarningMessage,
} from "./privacy.config";

export const BOOT_CONFIG = "BOOT_CONFIG";

export interface BootConfig {
  db: DbConfig;
  /** GET /app/client-policy, resolved once at boot (N11) rather than from process.env per request. */
  clientPolicy: ClientPolicyResponse;
  /** Privacy variables unset in production (BE-15, N1): logged at boot, named by /health/ready. */
  privacyWarnings: readonly PrivacyProductionVariable[];
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
        const privacyWarnings = privacyConfigWarnings(process.env);
        for (const name of privacyWarnings) {
          logger.warn(privacyWarningMessage(name));
        }
        return { db, clientPolicy: readClientPolicy(process.env), privacyWarnings };
      },
    },
  ],
  exports: [BOOT_CONFIG],
})
export class AppConfigModule {}
