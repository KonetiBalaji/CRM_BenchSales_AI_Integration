import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { RequestContextService } from "../../../infrastructure/context";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { AuthUser } from "../interfaces/auth-user.interface";

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly context: RequestContextService) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ params?: Record<string, string>; user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException("Missing authenticated user");
    }

    const routeTenantId = request.params?.tenantId;
    this.context.setTenant(user.tenantId);

    if (!routeTenantId) {
      return true;
    }

    if (routeTenantId !== user.tenantId) {
      throw new ForbiddenException("Tenant scope mismatch");
    }

    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]) ?? false;
  }
}
