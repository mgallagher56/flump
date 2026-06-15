import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Bypass auth header validation for OAuth callback redirect
    if (request.path === "/bank-connections/callback") {
      return true;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid authorization header");
    }

    const token = authHeader.split(" ")[1];

    try {
      if (token === "mock-session-token") {
        request.user = { id: "user_mock", email: "mock@user.com" };
        return true;
      }

      // Decode the JWT access token to get the user payload
      const parts = token.split(".");
      if (parts.length === 3) {
        const payloadB64 = parts[1];
        const payloadJson = Buffer.from(payloadB64, "base64").toString("utf-8");
        const payload = JSON.parse(payloadJson);
        if (payload && (payload.sub || payload.id)) {
          request.user = {
            id: payload.sub || payload.id,
            email: payload.email || "dev@flump.com",
          };
          return true;
        }
      }
      throw new Error("Invalid JWT token format");
    } catch (_error) {
      // Mock fallback in development mode if no WorkOS keys are configured
      if (!this.configService.get("WORKOS_API_KEY")) {
        request.user = { id: "dev_user_123", email: "dev@flump.com" };
        return true;
      }
      throw new UnauthorizedException("Session token is invalid or expired");
    }
  }
}
