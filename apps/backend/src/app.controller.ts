import type { BetaModeResponse, ClientPolicyResponse } from "@flump/api-contract";
import { Controller, Get, HttpCode, Inject, Res } from "@nestjs/common";
import type { Response } from "express";
import { AppService } from "./app.service";
import { isBetaInviteOnly } from "./auth/beta-access";
import { BOOT_CONFIG, type BootConfig } from "./config/config.module";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(BOOT_CONFIG) private readonly bootConfig: BootConfig,
  ) {}

  @Get()
  @HttpCode(200)
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * The supported mobile client versions (E12 B-A). Public on purpose: the app reads it before
   * sign-in to decide whether it must update. It holds configuration only, no user data. Resolved
   * once at boot (N11): changing a version is a variable change and a restart.
   */
  @Get("app/client-policy")
  @HttpCode(200)
  getClientPolicy(@Res({ passthrough: true }) res: Response): ClientPolicyResponse {
    res.setHeader("Cache-Control", "public, max-age=300");
    return this.bootConfig.clientPolicy;
  }

  /**
   * Whether the beta is invite-only, so the web app stops offering sign-up and refuses an
   * uninvited session before any page loads. Public on purpose: it is read before sign-in. It
   * returns one boolean and never the allowlists, the admins, their size or any email. Read per
   * request, from the same variables and the same rule (`isBetaInviteOnly`) as `AuthGuard`, so the
   * two can never disagree.
   */
  @Get("app/beta")
  @HttpCode(200)
  getBetaMode(@Res({ passthrough: true }) res: Response): BetaModeResponse {
    res.setHeader("Cache-Control", "no-store");
    return { inviteOnly: isBetaInviteOnly(process.env) };
  }
}
