import { Injectable } from "@nestjs/common";
import { MonzoProvider } from "./monzo.provider";
import {
  OPEN_BANKING_INSTITUTIONS,
  OpenBankingStandardProvider,
} from "./open-banking-standard.provider";
import { BankProvider } from "./provider.interface";
import { StarlingProvider } from "./starling.provider";
import { Trading212Provider } from "./trading212.provider";

@Injectable()
export class BankProviderRegistry {
  private readonly providers: Map<string, BankProvider> = new Map();

  constructor(
    private readonly monzoProvider: MonzoProvider,
    private readonly starlingProvider: StarlingProvider,
    private readonly trading212Provider: Trading212Provider,
  ) {
    this.providers.set("monzo", this.monzoProvider);
    this.providers.set("starling", this.starlingProvider);
    this.providers.set("trading212", this.trading212Provider);

    // Register all Open Banking Standard providers
    for (const [key, config] of Object.entries(OPEN_BANKING_INSTITUTIONS)) {
      this.providers.set(key, new OpenBankingStandardProvider(config));
    }
  }

  getProvider(institutionId: string): BankProvider | undefined {
    return this.providers.get(institutionId.toLowerCase());
  }

  hasProvider(institutionId: string): boolean {
    return this.providers.has(institutionId.toLowerCase());
  }

  getAllSupportedInstitutions(): string[] {
    return Array.from(this.providers.keys());
  }
}
