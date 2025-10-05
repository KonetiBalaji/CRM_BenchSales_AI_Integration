import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RolesGuard } from "./roles.guard";
import { AuthUser } from "../interfaces/auth-user.interface";

type ContextRequest = {
  user?: AuthUser;
};

const createContext = (request: ContextRequest) => ({
  switchToHttp: () => ({ getRequest: () => request }),
  getHandler: () => ({} as unknown),
  getClass: () => ({} as unknown)
});

describe("RolesGuard", () => {
  const reflector = {
    getAllAndOverride: vi.fn()
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);

  afterEach(() => {
    (reflector.getAllAndOverride as any).mockReset();
  });

  it("allows when no roles are specified", () => {
    (reflector.getAllAndOverride as any).mockReturnValueOnce(false).mockReturnValueOnce(undefined);
    const ctx = createContext({ user: { sub: "user", tenantId: "tenant", roles: [] } });

    expect(guard.canActivate(ctx as any)).toBe(true);
  });

  it("allows when user matches required role", () => {
    (reflector.getAllAndOverride as any).mockReturnValueOnce(false).mockReturnValueOnce([UserRole.ADMIN]);
    const ctx = createContext({ user: { sub: "user", tenantId: "tenant", roles: [UserRole.ADMIN] } });

    expect(guard.canActivate(ctx as any)).toBe(true);
  });

  it("throws when role is missing", () => {
    (reflector.getAllAndOverride as any).mockReturnValueOnce(false).mockReturnValueOnce([UserRole.ADMIN]);
    const ctx = createContext({ user: { sub: "user", tenantId: "tenant", roles: [UserRole.VIEWER] } });

    expect(() => guard.canActivate(ctx as any)).toThrow(ForbiddenException);
  });
});
