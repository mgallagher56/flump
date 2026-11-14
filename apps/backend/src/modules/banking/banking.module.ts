import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BankConnection } from "../../entities/bank-connection.entity";
import { BANK_CONSENT_REVOKER, ProviderBankConsentRevoker } from "./bank-consent-revoker";
import { MonzoProvider } from "./providers/monzo.provider";
import { BankProviderRegistry } from "./providers/provider.registry";
import { StarlingProvider } from "./providers/starling.provider";
import { Trading212Provider } from "./providers/trading212.provider";

/**
 * Bank providers, the provider registry and consent revocation. Connections stay off behind
 * BANK_CONNECTIONS_ENABLED (owner decision D11); this module only holds the code behind the flag.
 */
@Module({
  imports: [TypeOrmModule.forFeature([BankConnection])],
  providers: [
    MonzoProvider,
    StarlingProvider,
    Trading212Provider,
    BankProviderRegistry,
    // Revokes consent at each bank before deletion or reset (BE-12, audit H10).
    { provide: BANK_CONSENT_REVOKER, useClass: ProviderBankConsentRevoker },
  ],
  exports: [BankProviderRegistry, BANK_CONSENT_REVOKER],
})
export class BankingModule {}
