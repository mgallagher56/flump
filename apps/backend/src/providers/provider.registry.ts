import { Injectable } from "@nestjs/common";
import { MonzoProvider } from "./monzo.provider";
import { IBankProvider } from "./provider.interface";
import { StarlingProvider } from "./starling.provider";

@Injectable()
export class BankProviderRegistry {
  private readonly providers: Map<string, IBankProvider> = new Map();

  constructor(
    private readonly monzoProvider: MonzoProvider,
    private readonly starlingProvider: StarlingProvider,
  ) {
    this.providers.set("monzo", this.monzoProvider);
    this.providers.set("starling", this.starlingProvider);
  }

  getProvider(institutionId: string): IBankProvider | undefined {
    return this.providers.get(institutionId.toLowerCase());
  }

  hasProvider(institutionId: string): boolean {
    return this.providers.has(institutionId.toLowerCase());
  }
}
