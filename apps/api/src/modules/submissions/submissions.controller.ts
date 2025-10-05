import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { CreateSubmissionDto, UpdateSubmissionStatusDto } from "./dto/submission.dto";
import { SubmissionsService } from "./submissions.service";

@Controller("tenants/:tenantId/submissions")
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  list(
    @Param("tenantId") tenantId: string,
    @Query("status") status?: string
  ) {
    return this.submissionsService.list(tenantId, status as any);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  create(@Param("tenantId") tenantId: string, @Body() dto: CreateSubmissionDto) {
    return this.submissionsService.create(tenantId, dto);
  }

  @Patch(":id/status")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  updateStatus(
    @Param("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateSubmissionStatusDto
  ) {
    return this.submissionsService.updateStatus(tenantId, id, dto.status);
  }
}
