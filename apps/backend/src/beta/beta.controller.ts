import type {
  BetaAdminDeleteResponse,
  BetaAdminStatusResponse,
  BetaInviteListResponse,
  BetaMemberListResponse,
  CreateBetaInviteRequest,
  CreateBetaInviteResponse,
  RedeemBetaInviteRequest,
  RedeemBetaInviteResponse,
} from "@flump/api-contract";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AllowUninvited } from "../auth/allow-uninvited";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedRequest } from "../auth/authenticated-request";
import { RateLimit } from "../security/rate-limit.decorator";
import { BetaAdminGuard } from "./beta-admin.guard";
import { BetaInvitesService } from "./beta-invites.service";

/** Redeeming an invite link: any signed-in caller, including one not yet in the beta. */
@Controller("beta/invites")
export class BetaInvitesController {
  constructor(private readonly invites: BetaInvitesService) {}

  /**
   * Strictly rate limited per user and per address (`inviteRedeem`). Never logs the token. The
   * erased-account check still applies (AllowUninvited lifts only the beta refusal).
   */
  @Post("redeem")
  @HttpCode(200)
  @AllowUninvited()
  @RateLimit("inviteRedeem")
  @UseGuards(AuthGuard)
  redeem(
    @Req() req: AuthenticatedRequest,
    @Body() body: RedeemBetaInviteRequest,
  ): Promise<RedeemBetaInviteResponse> {
    return this.invites.redeem(req.user, body?.token);
  }
}

/** The admin's view: `BETA_ADMIN_USER_IDS` only, the 404 of an unknown route for anyone else. */
@Controller("beta/admin")
@RateLimit("write")
@UseGuards(AuthGuard, BetaAdminGuard)
export class BetaAdminController {
  constructor(private readonly invites: BetaInvitesService) {}

  @Get()
  @HttpCode(200)
  status(): BetaAdminStatusResponse {
    return { admin: true };
  }

  @Get("invites")
  @HttpCode(200)
  listInvites(): Promise<BetaInviteListResponse> {
    return this.invites.listInvites();
  }

  @Post("invites")
  @HttpCode(201)
  createInvite(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateBetaInviteRequest,
  ): Promise<CreateBetaInviteResponse> {
    return this.invites.createInvite(req.user.id, body?.label);
  }

  @Delete("invites/:id")
  @HttpCode(200)
  cancelInvite(@Param("id", new ParseUUIDPipe()) id: string): Promise<BetaAdminDeleteResponse> {
    return this.invites.cancelInvite(id);
  }

  @Get("members")
  @HttpCode(200)
  listMembers(): Promise<BetaMemberListResponse> {
    return this.invites.listMembers();
  }

  @Delete("members/:userId")
  @HttpCode(200)
  removeMember(@Param("userId") userId: string): Promise<BetaAdminDeleteResponse> {
    return this.invites.removeMember(userId);
  }
}
