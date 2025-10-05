import { ForbiddenException, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

import { RequestContextService } from "../../../infrastructure/context";
import { AuthUser } from "../interfaces/auth-user.interface";
import { TenantAccessGuard } from "./tenant.guard";

type RequestShape = {
  params?: Record<string, string>;
  user?: AuthUser;
};

const executionContextFor = (request: RequestShape): ExecutionContext => ({
  switchToHttp: () => ({ getRequest: () => request }),
  getHandler: () => ({} as unknown),
  getClass: () => ({} as unknown)
}) as ExecutionContext;

describe("TenantAccessGuard", () => {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(false)
  } as unknown as Reflector;

  const contextService = new RequestContextService();
  const guard = new TenantAccessGuard(reflector, contextService);

  const baseUser: AuthUser = {
    sub: "user-1",
    tenantId: "tenant-1",
    roles: []
  };

  it("allows matching tenant requests", () => {
    const context = executionContextFor({ params: { tenantId: "tenant-1" }, user: baseUser });

    const result = contextService.run(() => {
      const allowed = guard.canActivate(context);
      expect(contextService.getTenantId()).toBe("tenant-1");
      return allowed;
    });

    expect(result).toBe(true);
  });

  it("allows requests without tenant parameter", () => {
    const context = executionContextFor({ params: {}, user: baseUser });

    const result = contextService.run(() => guard.canActivate(context));

    expect(result).toBe(true);
  });

  it("blocks mismatched tenant identifiers", () => {
    const context = executionContextFor({ params: { tenantId: "tenant-2" }, user: baseUser });

    expect(() => contextService.run(() => guard.canActivate(context))).toThrow(ForbiddenException);
  });
});
