import type {
  AcceptHouseholdInvitationResponse,
  CreateHouseholdInvitationResponse,
  HouseholdDoneResponse,
  HouseholdInvitationPreviewResponse,
  HouseholdInvitationTokenRequest,
  HouseholdJointSummaryResponse,
  HouseholdResponse,
  UpdateHouseholdSharingRequest,
  UpdateHouseholdSharingResponse,
} from "@flump/api-contract";
import { Body, Controller, Delete, Get, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedRequest } from "../../auth/authenticated-request";
import { RateLimit } from "../../security/rate-limit.decorator";
import { HouseholdService } from "./household.service";

/**
 * Households (E34 C3). With the household switch off, HouseholdGateMiddleware answers every route
 * here like a route that does not exist, before the guards run. Every route is the caller's own:
 * there is none to remove the other person, change their settings or read their data (G6).
 * No AllowUninvited: the invite-only beta still applies to the invited person.
 */
@Controller("household")
@UseGuards(AuthGuard)
export class HouseholdController {
  constructor(private readonly households: HouseholdService) {}

  @Get()
  @HttpCode(200)
  get(@Req() req: AuthenticatedRequest): Promise<HouseholdResponse> {
    return this.households.get(req.user.id);
  }

  /** Never logs the token. Rate limited per user (`householdInviteCreate`). */
  @Post("invitations")
  @HttpCode(201)
  @RateLimit("householdInviteCreate")
  createInvitation(@Req() req: AuthenticatedRequest): Promise<CreateHouseholdInvitationResponse> {
    return this.households.createInvitation(req.user.id);
  }

  @Delete("invitations")
  @HttpCode(200)
  cancelInvitation(@Req() req: AuthenticatedRequest): Promise<HouseholdDoneResponse> {
    return this.households.cancelInvitation(req.user.id);
  }

  /** Strictly rate limited per user and per address, with accept (`householdInviteAccept`). */
  @Post("invitations/preview")
  @HttpCode(200)
  @RateLimit("householdInviteAccept")
  previewInvitation(
    @Req() req: AuthenticatedRequest,
    @Body() body: HouseholdInvitationTokenRequest,
  ): Promise<HouseholdInvitationPreviewResponse> {
    return this.households.previewInvitation(req.user.id, body?.token);
  }

  @Post("invitations/accept")
  @HttpCode(200)
  @RateLimit("householdInviteAccept")
  acceptInvitation(
    @Req() req: AuthenticatedRequest,
    @Body() body: HouseholdInvitationTokenRequest,
  ): Promise<AcceptHouseholdInvitationResponse> {
    return this.households.acceptInvitation(req.user.id, body?.token);
  }

  @Post("sharing")
  @HttpCode(200)
  updateSharing(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateHouseholdSharingRequest,
  ): Promise<UpdateHouseholdSharingResponse> {
    return this.households.updateSharing(req.user.id, body?.sharesJointSummary === true);
  }

  @Post("leave")
  @HttpCode(200)
  leave(@Req() req: AuthenticatedRequest): Promise<HouseholdDoneResponse> {
    return this.households.leave(req.user.id);
  }

  @Get("joint-summary")
  @HttpCode(200)
  jointSummary(@Req() req: AuthenticatedRequest): Promise<HouseholdJointSummaryResponse> {
    return this.households.jointSummary(req.user.id);
  }
}
