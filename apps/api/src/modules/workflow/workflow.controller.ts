import { Body, Controller, Param, Post } from "@nestjs/common";
import { RequirementStatus, SubmissionStatus, UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { WorkflowService } from "./workflow.service";

@Controller("/api/tenants/:tenantId/workflow")
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}

  @Post("requirements/:id/transition")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  transitionRequirement(
    @Param("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() body: { to: RequirementStatus }
  ) {
    return this.service.transitionRequirement(tenantId, id, body.to);
  }

  @Post("submissions/:id/transition")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  transitionSubmission(
    @Param("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() body: { to: SubmissionStatus }
  ) {
    return this.service.transitionSubmission(tenantId, id, body.to);
  }

  @Post("comments/:entity/:id")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  addComment(
    @Param("tenantId") tenantId: string,
    @Param("entity") entity: "requirement" | "submission",
    @Param("id") id: string,
    @Body() body: { text: string }
  ) {
    return this.service.addComment(tenantId, entity, id, body.text);
  }

  @Post("escalations/schedule/:key")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  scheduleEscalation(
    @Param("tenantId") tenantId: string,
    @Param("key") key: string,
    @Body() body: { delayMs: number; subject: string; body: string }
  ) {
    return this.service.scheduleEscalation(tenantId, key, body.delayMs, { subject: body.subject, body: body.body });
  }
}



