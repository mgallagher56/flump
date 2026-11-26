import { Module } from "@nestjs/common";
import { IdentityModule } from "../../identity/identity.module";
import { SessionController } from "./session.controller";

/** The caller's own WorkOS session: sign-out from the mobile app (E12 S2b). */
@Module({
  imports: [IdentityModule],
  controllers: [SessionController],
})
export class SessionModule {}
