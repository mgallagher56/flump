import { resolveBankingKey, resolveBankingKeyring } from "@flump/banking/server";
import { Global, Logger, Module } from "@nestjs/common";
import { type DbConfig, resolveDbConfig } from "./db.config";

export const BOOT_CONFIG = "BOOT_CONFIG";

export interface BootConfig {
  db: DbConfig;
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
        const logger = new Logger("AppConfigModule");
        for (const warning of db.warnings) {
          logger.warn(warning);
        }
        return { db };
      },
    },
  ],
  exports: [BOOT_CONFIG],
})
export class AppConfigModule {}
