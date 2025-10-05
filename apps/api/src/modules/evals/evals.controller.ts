import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { EvalsService } from "./evals.service";

@Controller("tenants/:tenantId/evals")
export class EvalsController {
  constructor(private readonly evals: EvalsService) {}

  @Post("retrieval")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  submitRetrieval(@Param("tenantId") tenantId: string, @Body() body: { pairs: Array<{ query: string; expectedIds: string[] }> }) {
    return this.evals.submitRetrievalEval(tenantId, body);
  }

  @Get("metrics")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  metrics(@Param("tenantId") tenantId: string) {
    return this.evals.metrics(tenantId);
  }
}


