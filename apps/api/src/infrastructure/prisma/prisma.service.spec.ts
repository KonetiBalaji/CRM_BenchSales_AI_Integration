import { describe, expect, it } from "vitest";

import { RequestContextService } from "../context";
import { PrismaService } from "./prisma.service";

describe("PrismaService tenant middleware helpers", () => {
  const service = new PrismaService(new RequestContextService());

  it("merges tenant filter onto queries", () => {
    const result = (service as any).mergeTenantFilter({ id: "abc" }, "tenant-1");

    expect(result).toMatchObject({ id: "abc", tenantId: "tenant-1" });
  });

  it("injects tenant on create data", () => {
    const payload = (service as any).attachTenant({}, "tenant-1", true);

    expect(payload).toMatchObject({ tenantId: "tenant-1", tenant: { connect: { id: "tenant-1" } } });
  });

  it("does not overwrite explicit tenant", () => {
    const payload = (service as any).attachTenant({ tenantId: "tenant-2" }, "tenant-1", false);

    expect(payload).toMatchObject({ tenantId: "tenant-2" });
  });
});
