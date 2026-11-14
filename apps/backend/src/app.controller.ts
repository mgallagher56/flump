import { Controller, Get, HttpCode, Res } from "@nestjs/common";
import type { Response } from "express";
import { AppService } from "./app.service";
import { readClientPolicy } from "./config/client-policy.config";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @HttpCode(200)
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * The supported mobile client versions (E12 B-A). Public on purpose: the app reads it before
   * sign-in to decide whether it must update. It holds configuration only, no user data.
   */
  @Get("app/client-policy")
  @HttpCode(200)
  getClientPolicy(@Res({ passthrough: true }) res: Response) {
    res.setHeader("Cache-Control", "public, max-age=300");
    return readClientPolicy(process.env);
  }
}
