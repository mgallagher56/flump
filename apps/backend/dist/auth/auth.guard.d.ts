import { CanActivate, ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
export declare class AuthGuard implements CanActivate {
    private readonly configService;
    private readonly workos;
    private readonly clientId;
    constructor(configService: ConfigService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
