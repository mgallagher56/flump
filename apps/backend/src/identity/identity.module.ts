import { Module } from "@nestjs/common";
import { USER_IDENTITY_ADAPTER, WorkOSIdentityAdapter } from "./identity.adapter";

/** The identity provider behind a port (name changes, user deletion). */
@Module({
  providers: [{ provide: USER_IDENTITY_ADAPTER, useClass: WorkOSIdentityAdapter }],
  exports: [USER_IDENTITY_ADAPTER],
})
export class IdentityModule {}
