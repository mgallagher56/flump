import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BETA_MEMBERSHIP_CHECK } from "../auth/beta-access";
import { BetaMember } from "../entities/beta-member.entity";
import { IdentityModule } from "../identity/identity.module";
import { BetaAdminController, BetaInvitesController } from "./beta.controller";
import { BetaAdminGuard } from "./beta-admin.guard";
import { BetaInvitesService } from "./beta-invites.service";
import { BetaMembershipService } from "./beta-membership.service";
import { BetaPeopleService } from "./beta-people.service";

/**
 * Invite links for the invite-only beta: redeeming, the admin routes, and the membership lookup
 * the AuthGuard (lazily, through BETA_MEMBERSHIP_CHECK), AI connection tokens and Retirement use.
 */
@Module({
  imports: [TypeOrmModule.forFeature([BetaMember]), IdentityModule],
  controllers: [BetaInvitesController, BetaAdminController],
  providers: [
    BetaMembershipService,
    { provide: BETA_MEMBERSHIP_CHECK, useExisting: BetaMembershipService },
    BetaPeopleService,
    BetaInvitesService,
    BetaAdminGuard,
  ],
  exports: [BetaMembershipService, BETA_MEMBERSHIP_CHECK],
})
export class BetaModule {}
