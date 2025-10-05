import { Body, Controller, Param, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { MatchRequestDto } from "./dto/match-request.dto";
import { MatchFeedbackDto } from "./dto/match-feedback.dto";
import { MatchingService } from "./matching.service";

@Controller("tenants/:tenantId/matching")
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post("requirements/:requirementId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  matchRequirement(
    @Param("tenantId") tenantId: string,
    @Param("requirementId") requirementId: string,
    @Body() dto: MatchRequestDto
  ) {
    return this.matchingService.matchRequirement(tenantId, requirementId, dto.topN ?? 5);
  }

  @Post("matches/:matchId/feedback")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  submitFeedback(
    @Param("tenantId") tenantId: string,
    @Param("matchId") matchId: string,
    @Body() dto: MatchFeedbackDto
  ) {
    return this.matchingService.submitFeedback(tenantId, matchId, dto);
  }
}
