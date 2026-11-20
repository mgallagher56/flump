import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BetaModule } from "../../beta/beta.module";
import { Account } from "../../entities/account.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { AgentAuditEvent } from "../../entities/agent-audit-event.entity";
import { BudgetEntry } from "../../entities/budget-entry.entity";
import { McpToken } from "../../entities/mcp-token.entity";
import { RetirementPlan } from "../../entities/retirement-plan.entity";
import { TaxRecord } from "../../entities/tax-record.entity";
import { Transaction } from "../../entities/transaction.entity";
import { SecurityModule } from "../../security/security.module";
import { FinanceModule } from "../finance/finance.module";
import { ImportsModule } from "../imports/imports.module";
import { ProfileModule } from "../profile/profile.module";
import { AgentAuditService } from "./agent-audit.service";
import { AgentDataService } from "./agent-data.service";
import { FinancialPictureService } from "./financial-picture.service";
import { McpController } from "./mcp.controller";
import { McpService } from "./mcp.service";
import { McpImportsAdapter } from "./mcp-imports.adapter";
import { McpPatGuard } from "./mcp-pat.guard";
import { McpTokenService } from "./mcp-token.service";

/** The MCP server, its tokens and its audit trail. The top of the domain graph. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Account,
      AccountDetail,
      AgentAuditEvent,
      BudgetEntry,
      McpToken,
      RetirementPlan,
      TaxRecord,
      Transaction,
    ]),
    FinanceModule,
    ImportsModule,
    ProfileModule,
    // The beta membership lookup: AI tokens and the Retirement tools follow the invite-only beta.
    BetaModule,
    // RateLimitStore and SHARED_RATE_LIMIT_STORE for the import adapter and the MCP limiters.
    SecurityModule,
  ],
  controllers: [McpController],
  providers: [
    AgentAuditService,
    AgentDataService,
    FinancialPictureService,
    McpImportsAdapter,
    McpPatGuard,
    McpService,
    McpTokenService,
  ],
})
export class AgentModule {}
