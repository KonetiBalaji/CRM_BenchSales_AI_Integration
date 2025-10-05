import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { ConsultantsService } from "./consultants.service";
import { CreateConsultantDto, UpdateConsultantDto } from "./dto/consultant.dto";

@Controller("tenants/:tenantId/consultants")
export class ConsultantsController {
  constructor(private readonly consultantsService: ConsultantsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  list(
    @Param("tenantId") tenantId: string,
    @Query("search") search?: string
  ) {
    return this.consultantsService.list(tenantId, search);
  }

  @Get(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  get(@Param("tenantId") tenantId: string, @Param("id") id: string) {
    return this.consultantsService.get(tenantId, id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  create(@Param("tenantId") tenantId: string, @Body() dto: CreateConsultantDto) {
    return this.consultantsService.create({ ...dto, tenantId });
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateConsultantDto
  ) {
    return this.consultantsService.update(tenantId, id, dto);
  }
}
