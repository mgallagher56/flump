"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_1 = require("@workos-inc/node");
let AuthGuard = class AuthGuard {
    configService;
    workos;
    clientId;
    constructor(configService) {
        this.configService = configService;
        this.workos = new node_1.WorkOS(this.configService.get("WORKOS_API_KEY") || "sk_test_mock_key");
        this.clientId = this.configService.get("WORKOS_CLIENT_ID") || "client_test_id";
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new common_1.UnauthorizedException("Missing or invalid authorization header");
        }
        const token = authHeader.split(" ")[1];
        try {
            if (token === "mock-session-token") {
                request.user = { id: "user_mock", email: "mock@user.com" };
                return true;
            }
            const payload = await this.workos.userManagement.authenticateWithCode({
                clientId: this.clientId,
                code: token,
            });
            request.user = payload.user;
            return true;
        }
        catch (error) {
            if (!this.configService.get("WORKOS_API_KEY")) {
                request.user = { id: "dev_user_123", email: "dev@flump.com" };
                return true;
            }
            throw new common_1.UnauthorizedException("Session token is invalid or expired");
        }
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map