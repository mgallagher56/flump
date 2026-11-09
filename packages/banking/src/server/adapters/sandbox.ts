import { enforceSignConvention } from "../../core/sign-enforcement.js";
import type { NormalizedAccount, NormalizedTransaction } from "../../core/types.js";
import { decryptBankingToken, encryptBankingToken } from "../crypto.js";
import type { BankingProviderAdapter } from "../interface.js";

export type SandboxPersona = "debt" | "wealth";

export const SANDBOX_FIXTURES: Record<
  SandboxPersona,
  { accounts: NormalizedAccount[]; transactions: NormalizedTransaction[] }
> = {
  debt: {
    accounts: (
      [
        {
          externalAccountId: "sb-monzo-current",
          provider: "sandbox",
          institutionName: "Monzo Bank",
          name: "Monzo Current Account",
          category: "CURRENT",
          currency: "GBP",
          netWorthImpactGbp: 340.5,
          principalOwedGbp: 0,
          isTaxFreeIsaWrapper: false,
          lastSyncedAt: new Date().toISOString(),
        },
        {
          externalAccountId: "sb-monzo-overdraft",
          provider: "sandbox",
          institutionName: "Monzo Bank",
          name: "Monzo Arranged Overdraft",
          category: "OVERDRAFT",
          currency: "GBP",
          netWorthImpactGbp: -750.0,
          principalOwedGbp: 750.0,
          creditLimitGbp: 1000,
          interestRateApr: 39.0,
          isTaxFreeIsaWrapper: false,
          lastSyncedAt: new Date().toISOString(),
        },
        {
          externalAccountId: "sb-barclaycard-cc",
          provider: "sandbox",
          institutionName: "Barclaycard",
          name: "Barclaycard Platinum",
          category: "CREDIT_CARD",
          currency: "GBP",
          netWorthImpactGbp: -3200.0,
          principalOwedGbp: 3200.0,
          creditLimitGbp: 4500,
          interestRateApr: 24.9,
          isTaxFreeIsaWrapper: false,
          lastSyncedAt: new Date().toISOString(),
        },
        {
          externalAccountId: "sb-virgin-bt",
          provider: "sandbox",
          institutionName: "Virgin Money",
          name: "0% Balance Transfer Card",
          category: "CREDIT_CARD",
          currency: "GBP",
          netWorthImpactGbp: -2250.0,
          principalOwedGbp: 2250.0,
          creditLimitGbp: 3000,
          interestRateApr: 0.0,
          promoAprExpiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10), // Expiring in 90 days!
          revertApr: 28.9,
          isTaxFreeIsaWrapper: false,
          lastSyncedAt: new Date().toISOString(),
        },
      ] as NormalizedAccount[]
    ).map(enforceSignConvention),
    transactions: [
      {
        externalTransactionId: "tx-debt-inc-1",
        externalAccountId: "sb-monzo-current",
        postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        merchantOrDescription: "ACME Corp Monthly Salary",
        amountGbp: 2420.0,
        flumpBucket: "INCOME",
        isRecurringContract: true,
      },
      {
        externalTransactionId: "tx-debt-rent-1",
        externalAccountId: "sb-monzo-current",
        postedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        merchantOrDescription: "Foxtons Residential Rent",
        amountGbp: -950.0,
        flumpBucket: "PRIORITY_HOUSING_COUNCIL_ENERGY",
        isRecurringContract: true,
      },
      {
        externalTransactionId: "tx-debt-council-1",
        externalAccountId: "sb-monzo-current",
        postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        merchantOrDescription: "Camden Council Tax",
        amountGbp: -165.0,
        flumpBucket: "PRIORITY_HOUSING_COUNCIL_ENERGY",
        isRecurringContract: true,
      },
      {
        externalTransactionId: "tx-debt-energy-1",
        externalAccountId: "sb-monzo-current",
        postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        merchantOrDescription: "Octopus Energy Direct Debit",
        amountGbp: -130.0,
        flumpBucket: "PRIORITY_HOUSING_COUNCIL_ENERGY",
        isRecurringContract: true,
      },
      {
        externalTransactionId: "tx-debt-groc-1",
        externalAccountId: "sb-monzo-current",
        postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        merchantOrDescription: "Tesco Express Groceries",
        amountGbp: -68.4,
        flumpBucket: "ESSENTIAL_BILLS_GROCERIES",
        isRecurringContract: false,
      },
      {
        externalTransactionId: "tx-debt-ccmin-1",
        externalAccountId: "sb-monzo-current",
        postedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        merchantOrDescription: "Barclaycard Minimum Repayment",
        amountGbp: -80.0,
        flumpBucket: "DEBT_MINIMUM_REPAYMENT",
        isRecurringContract: true,
      },
    ],
  },
  wealth: {
    accounts: (
      [
        {
          externalAccountId: "sb-hsbc-premier",
          provider: "sandbox",
          institutionName: "HSBC",
          name: "Premier Current Account",
          category: "CURRENT",
          currency: "GBP",
          netWorthImpactGbp: 6420.0,
          principalOwedGbp: 0,
          isTaxFreeIsaWrapper: false,
          lastSyncedAt: new Date().toISOString(),
        },
        {
          externalAccountId: "sb-vanguard-isa",
          provider: "sandbox",
          institutionName: "Vanguard UK",
          name: "Stocks & Shares ISA (FTSE Global All Cap)",
          category: "STOCKS_ISA",
          currency: "GBP",
          netWorthImpactGbp: 48500.0,
          principalOwedGbp: 0,
          interestRateApr: 7.2,
          isTaxFreeIsaWrapper: true,
          lastSyncedAt: new Date().toISOString(),
        },
        {
          externalAccountId: "sb-aviva-pension",
          provider: "sandbox",
          institutionName: "Aviva",
          name: "Workplace Pension Scheme",
          category: "PENSION_WORKPLACE",
          currency: "GBP",
          netWorthImpactGbp: 92400.0,
          principalOwedGbp: 0,
          isTaxFreeIsaWrapper: true,
          lastSyncedAt: new Date().toISOString(),
        },
        {
          externalAccountId: "sb-natwest-res-mortgage",
          provider: "sandbox",
          institutionName: "NatWest",
          name: "Residential Fixed Mortgage",
          category: "MORTGAGE_RESIDENTIAL",
          currency: "GBP",
          netWorthImpactGbp: -285000.0,
          principalOwedGbp: 285000.0,
          interestRateApr: 4.19,
          mortgageFixExpiryDate: new Date(Date.now() + 420 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10), // ~14 months
          isTaxFreeIsaWrapper: false,
          lastSyncedAt: new Date().toISOString(),
        },
        {
          externalAccountId: "sb-bm-btl-mortgage",
          provider: "sandbox",
          institutionName: "Birmingham Midshires",
          name: "Buy-to-Let Interest-Only Mortgage",
          category: "MORTGAGE_BTL",
          currency: "GBP",
          netWorthImpactGbp: -160000.0,
          principalOwedGbp: 160000.0,
          interestRateApr: 5.4,
          isTaxFreeIsaWrapper: false,
          lastSyncedAt: new Date().toISOString(),
        },
      ] as NormalizedAccount[]
    ).map(enforceSignConvention),
    transactions: [
      {
        externalTransactionId: "tx-wealth-sal-1",
        externalAccountId: "sb-hsbc-premier",
        postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        merchantOrDescription: "Tech Consultancy Ltd Net Salary",
        amountGbp: 5890.0,
        flumpBucket: "INCOME",
        isRecurringContract: true,
      },
      {
        externalTransactionId: "tx-wealth-rent-in-1",
        externalAccountId: "sb-hsbc-premier",
        postedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        merchantOrDescription: "BTL Rental Inflow Tenant Payment",
        amountGbp: 1450.0,
        flumpBucket: "INCOME",
        isRecurringContract: true,
      },
      {
        externalTransactionId: "tx-wealth-res-mort-1",
        externalAccountId: "sb-hsbc-premier",
        postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        merchantOrDescription: "NatWest Mortgage Direct Debit",
        amountGbp: -1480.0,
        flumpBucket: "PRIORITY_HOUSING_COUNCIL_ENERGY",
        isRecurringContract: true,
      },
      {
        externalTransactionId: "tx-wealth-btl-mort-1",
        externalAccountId: "sb-hsbc-premier",
        postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        merchantOrDescription: "Birmingham Midshires Interest Payment",
        amountGbp: -720.0,
        flumpBucket: "PRIORITY_HOUSING_COUNCIL_ENERGY",
        isRecurringContract: true,
      },
      {
        externalTransactionId: "tx-wealth-isa-trans-1",
        externalAccountId: "sb-hsbc-premier",
        postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        merchantOrDescription: "Vanguard UK Monthly Standing Order",
        amountGbp: -1000.0,
        flumpBucket: "SAVINGS_INVESTMENTS_TRANSFER",
        isRecurringContract: true,
      },
    ],
  },
};

export class SandboxAdapter implements BankingProviderAdapter {
  readonly providerName = "sandbox" as const;
  private defaultPersona: SandboxPersona;

  constructor(defaultPersona: SandboxPersona = "debt") {
    this.defaultPersona = defaultPersona;
  }

  async createLinkSession(
    userId: string,
    reauthConnectionId?: string,
  ): Promise<{ linkTokenOrUrl: string; expiresAt: string }> {
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    return {
      linkTokenOrUrl: `sandbox://link?user=${encodeURIComponent(userId)}&persona=${this.defaultPersona}&reauth=${reauthConnectionId ?? "false"}`,
      expiresAt,
    };
  }

  async exchangePublicToken(publicTokenOrCode: string): Promise<{
    accessTokenEncrypted: string;
    providerItemId: string;
    consentExpiresAt: string;
  }> {
    // Determine persona from public token query e.g. "sandbox_token_wealth" or "sandbox_token_debt"
    const persona: SandboxPersona = publicTokenOrCode.includes("wealth") ? "wealth" : "debt";
    const rawPayload = JSON.stringify({
      persona,
      createdAt: new Date().toISOString(),
    });

    const accessTokenEncrypted = encryptBankingToken(rawPayload);
    const consentExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days

    return {
      accessTokenEncrypted,
      providerItemId: `sandbox_item_${persona}_${Date.now()}`,
      consentExpiresAt,
    };
  }

  async getAccounts(accessTokenEncrypted: string): Promise<NormalizedAccount[]> {
    let persona: SandboxPersona = this.defaultPersona;
    try {
      const decrypted = decryptBankingToken(accessTokenEncrypted);
      const parsed = JSON.parse(decrypted);
      if (parsed.persona === "wealth" || parsed.persona === "debt") {
        persona = parsed.persona;
      }
    } catch {
      // Fallback to default persona
    }

    return SANDBOX_FIXTURES[persona].accounts;
  }

  async syncTransactions(
    accessTokenEncrypted: string,
    _cursor?: string,
  ): Promise<{
    added: NormalizedTransaction[];
    modified: NormalizedTransaction[];
    removedIds: string[];
    nextCursor: string;
  }> {
    let persona: SandboxPersona = this.defaultPersona;
    try {
      const decrypted = decryptBankingToken(accessTokenEncrypted);
      const parsed = JSON.parse(decrypted);
      if (parsed.persona === "wealth" || parsed.persona === "debt") {
        persona = parsed.persona;
      }
    } catch {
      // Fallback
    }

    return {
      added: SANDBOX_FIXTURES[persona].transactions,
      modified: [],
      removedIds: [],
      nextCursor: `cursor_sb_${persona}_${Date.now()}`,
    };
  }

  async revokeConnection(_accessTokenEncrypted: string): Promise<void> {
    // Sandbox connection successfully revoked
    return Promise.resolve();
  }
}
