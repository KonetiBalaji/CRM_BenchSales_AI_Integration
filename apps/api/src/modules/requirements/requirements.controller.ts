import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { CreateRequirementDto, UpdateRequirementDto } from "./dto/requirement.dto";
import { RequirementsService } from "./requirements.service";

@Controller("tenants/:tenantId/requirements")
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  list(
    @Param("tenantId") tenantId: string,
    @Query("status") status?: string
  ) {
    return this.requirementsService.list(tenantId, status as any);
  }

  @Get(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  get(@Param("tenantId") tenantId: string, @Param("id") id: string) {
    return this.requirementsService.get(tenantId, id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  create(@Param("tenantId") tenantId: string, @Body() dto: CreateRequirementDto) {
    return this.requirementsService.create({ ...dto, tenantId });
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateRequirementDto
  ) {
    return this.requirementsService.update(tenantId, id, dto);
  }
}
