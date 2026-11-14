import type { ClientPolicyResponse } from "@flump/api-contract";
import { Controller, Get, HttpCode, Inject, Res } from "@nestjs/common";
import type { Response } from "express";
import { AppService } from "./app.service";
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
}
