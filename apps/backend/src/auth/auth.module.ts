import { Global, Logger, Module } from "@nestjs/common";
import { resolveAuthMode } from "./auth.config";
import { AuthGuard } from "./auth.guard";
import { DevBypassVerifier } from "./dev-bypass.verifier";
import { TOKEN_VERIFIER, type TokenVerifier } from "./token-verifier";
import { WorkOsJwtVerifier, workosIssuer, workosJwksFromUrl } from "./workos-jwt.verifier";

export const AUTH_MODE = "AUTH_MODE";

@Global()
@Module({
  providers: [
    {
      // Computed once; throws at boot (before listening) on invalid config.
      provide: AUTH_MODE,
      useFactory: (): "workos" | "dev" => resolveAuthMode(process.env),
    },
    {
      provide: TOKEN_VERIFIER,
      inject: [AUTH_MODE],
      useFactory: (mode: "workos" | "dev"): TokenVerifier => {
        if (mode === "dev") {
          new Logger("AuthModule").warn(
            "AUTH_DEV_BYPASS is enabled: the mock session token is accepted. Never use in production.",
          );
          return new DevBypassVerifier();
        }
        const clientId = process.env.WORKOS_CLIENT_ID as string;
        return new WorkOsJwtVerifier({
          jwks: workosJwksFromUrl(clientId),
          issuer: workosIssuer(clientId),
        });
      },
    },
    AuthGuard,
  ],
  exports: [AUTH_MODE, TOKEN_VERIFIER, AuthGuard],
})
export class AuthModule {}
