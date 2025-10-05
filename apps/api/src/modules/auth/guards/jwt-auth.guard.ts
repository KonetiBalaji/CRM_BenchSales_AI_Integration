import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";

import { RequestContextService } from "../../../infrastructure/context";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { AuthUser } from "../interfaces/auth-user.interface";

interface RequestWithUser {
  headers?: Record<string, unknown>;
  user?: AuthUser;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly rolesClaim: string;
  private readonly tenantClaim: string;
  private readonly mockEnabled: boolean;
  private readonly mockJwt: string | undefined;

  constructor(
    private readonly reflector: Reflector,
    private readonly context: RequestContextService,
    private readonly configService: ConfigService
  ) {
    super();
    const authConfig = this.configService.get<{
      rolesClaim?: string;
      tenantClaim?: string;
      disableVerification?: boolean;
      mockJwt?: string;
    }>("auth") ?? {};
    this.rolesClaim = authConfig.rolesClaim ?? "https://benchcrm.ai/roles";
    this.tenantClaim = authConfig.tenantClaim ?? "https://benchcrm.ai/tenant";
    this.mockEnabled = authConfig.disableVerification === true;
    this.mockJwt = authConfig.mockJwt && authConfig.mockJwt.length > 0 ? authConfig.mockJwt : undefined;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }

    if (this.tryMockAuthentication(context)) {
      return true;
    }

    return (await super.canActivate(context)) as boolean;
  }

  handleRequest<TUser extends AuthUser = AuthUser>(
    err: unknown,
    user: TUser | undefined,
    info: unknown,
    context: ExecutionContext,
    status?: unknown
  ): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException({ info, status });
    }
    this.context.setUser(user as unknown as AuthUser);
    return user;
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]) ?? false;
  }

  private tryMockAuthentication(context: ExecutionContext): boolean {
    if (!this.mockEnabled) {
      return false;
    }
    const httpContext = context.switchToHttp();
    if (!httpContext) {
      return false;
    }
    const request = httpContext.getRequest<RequestWithUser>();
    if (!request) {
      return false;
    }

    const token = this.extractBearerToken(request) ?? this.mockJwt;
    const payload = token ? this.decodeJwt(token) : undefined;

    const tenantId = this.resolveTenantId(payload) ?? "demo-tenant";
    const user: AuthUser = {
      sub: this.resolveSubject(payload),
      tenantId,
      roles: this.resolveRoles(payload),
      email: this.resolveStringClaim(payload, "email"),
      name: this.resolveStringClaim(payload, "name"),
      picture: this.resolveStringClaim(payload, "picture")
    };

    request.user = user;
    this.context.setUser(user);
    this.context.setTenant(tenantId);
    return true;
  }

  private extractBearerToken(request: RequestWithUser): string | undefined {
    const header = request.headers?.authorization ?? request.headers?.Authorization;
    if (typeof header !== "string") {
      return undefined;
    }
    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      return undefined;
    }
    return token.trim();
  }

  private decodeJwt(token: string): Record<string, unknown> | undefined {
    const segments = token.split(".");
    if (segments.length < 2) {
      return undefined;
    }
    const payloadSegment = segments[1];
    try {
      const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
      const payloadJson = Buffer.from(normalized, "base64").toString("utf8");
      return JSON.parse(payloadJson) as Record<string, unknown>;
    } catch (error) {
      return undefined;
    }
  }

  private resolveTenantId(payload?: Record<string, unknown>): string | undefined {
    if (!payload) {
      return undefined;
    }
    const claim = payload[this.tenantClaim];
    return typeof claim === "string" && claim.length > 0 ? claim : undefined;
  }

  private resolveSubject(payload?: Record<string, unknown>): string {
    const subject = payload?.sub;
    return typeof subject === "string" && subject.length > 0 ? subject : "mock-user";
  }

  private resolveRoles(payload?: Record<string, unknown>): string[] {
    if (!payload) {
      return ["OWNER"];
    }
    const claim = payload[this.rolesClaim];
    if (Array.isArray(claim)) {
      return claim.filter((role): role is string => typeof role === "string" && role.length > 0);
    }
    if (typeof claim === "string") {
      return claim.split(",").map((role) => role.trim()).filter(Boolean);
    }
    const scope = payload.scope;
    if (typeof scope === "string") {
      return scope.split(" ").filter(Boolean);
    }
    return ["OWNER"];
  }

  private resolveStringClaim(payload: Record<string, unknown> | undefined, key: string): string | undefined {
    if (!payload) {
      return undefined;
    }
    const value = payload[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }
}
