import { Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";

import { DedupeService, DuplicateCluster, DuplicateMatch } from "./dedupe.service";

@Controller("tenants/:tenantId")
export class DedupeController {
  constructor(private readonly dedupeService: DedupeService) {}

  @Post("consultants/:consultantId/dedupe/refresh")
  refreshConsultant(@Param("tenantId") tenantId: string, @Param("consultantId") consultantId: string): Promise<void> {
    return this.dedupeService.refreshConsultantSignatures(tenantId, consultantId);
  }

  @Get("consultants/:consultantId/dedupe")
  getConsultantDuplicates(
    @Param("tenantId") tenantId: string,
    @Param("consultantId") consultantId: string
  ): Promise<DuplicateMatch[]> {
    return this.dedupeService.findPotentialDuplicates(tenantId, consultantId);
  }

  @Get("dedupe/candidates")
  getTenantCandidates(
    @Param("tenantId") tenantId: string,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number
  ): Promise<DuplicateCluster[]> {
    return this.dedupeService.findTenantDuplicateCandidates(tenantId, limit ?? 5);
  }
}
