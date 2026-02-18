/**
 * @fileoverview Candidate Pipeline Management Controller
 * 
 * This controller provides candidate pipeline management endpoints for the CRM BenchSales AI Integration application.
 * It handles pipeline stages, workflow automation, and candidate progression tracking.
 * 
 * Key features:
 * - Pipeline stage management
 * - Workflow automation
 * - Candidate progression tracking
 * - Stage transition rules
 * - Pipeline analytics
 * - Role-based access control for different user types
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { CandidatePipelineManagementService } from "./candidate-pipeline-management.service";

/**
 * Controller for candidate pipeline management functionality.
 * 
 * This controller provides endpoints for managing candidate pipelines,
 * stage transitions, and workflow automation with comprehensive
 * analytics and progression tracking.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Move candidate to next stage
 * POST /tenants/{tenantId}/pipeline/candidates/{candidateId}/advance
 * {
 *   "toStage": "interview",
 *   "notes": "Passed initial screening"
 * }
 * 
 * // Get pipeline analytics
 * GET /tenants/{tenantId}/pipeline/analytics?period=30d
 * ```
 */
@Controller("tenants/:tenantId/pipeline")
export class CandidatePipelineManagementController {
  /**
   * Initializes the candidate pipeline management controller with the service dependency.
   * 
   * @param service - The candidate pipeline management service for business logic
   */
  constructor(private readonly service: CandidatePipelineManagementService) {}

  /**
   * Moves a candidate to the next stage in the pipeline.
   * 
   * This endpoint advances a candidate through the pipeline stages
   * with automatic workflow triggers and notifications.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param candidateId - The candidate identifier
   * @param body - Request body containing advancement details
   * @param body.toStage - Target stage to move to
   * @param body.notes - Optional notes for the transition
   * @param body.requirementId - Associated requirement ID
   * @param body.triggerActions - Actions to trigger on advancement
   * @returns Object containing advancement confirmation and new stage details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "toStage": "interview",
   *   "notes": "Passed initial screening, ready for technical interview",
   *   "requirementId": "req-123",
   *   "triggerActions": ["send_interview_invite", "update_candidate_status"]
   * }
   * 
   * // Response format
   * {
   *   "candidateId": "candidate-456",
   *   "fromStage": "screening",
   *   "toStage": "interview",
   *   "transitionId": "transition-789",
   *   "status": "ADVANCED",
   *   "notes": "Passed initial screening, ready for technical interview",
   *   "advancedAt": "2024-01-15T10:30:00Z"
   * }
   * ```
   */
  @Post("candidates/:candidateId/advance")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  advanceCandidate(
    @Param("tenantId") tenantId: string,
    @Param("candidateId") candidateId: string,
    @Body() body: { 
      toStage: string; 
      notes?: string; 
      requirementId?: string; 
      triggerActions?: string[] 
    }
  ) {
    return this.service.advanceCandidate(tenantId, candidateId, body.toStage, body.notes, body.requirementId, body.triggerActions);
  }

  /**
   * Retrieves all candidates in the pipeline with their current stages.
   * 
   * This endpoint provides a comprehensive view of all candidates
   * in the pipeline with their progression status and stage information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering and pagination
   * @param query.stage - Filter by pipeline stage
   * @param query.requirementId - Filter by requirement ID
   * @param query.status - Filter by candidate status
   * @param query.limit - Maximum number of candidates to return
   * @param query.offset - Number of candidates to skip
   * @returns Array of candidates with pipeline information
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "candidateId": "candidate-456",
   *     "candidateName": "John Doe",
   *     "currentStage": "interview",
   *     "stageProgress": 0.6,
   *     "requirementTitle": "Senior React Developer",
   *     "clientName": "Tech Corp",
   *     "enteredPipeline": "2024-01-10T09:00:00Z",
   *     "lastActivity": "2024-01-15T10:30:00Z",
   *     "daysInStage": 5
   *   }
   * ]
   * ```
   */
  @Get("candidates")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getPipelineCandidates(
    @Param("tenantId") tenantId: string,
    @Query("stage") stage?: string,
    @Query("requirementId") requirementId?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.service.getPipelineCandidates(tenantId, stage, requirementId, status, limit, offset);
  }

  /**
   * Retrieves detailed information about a candidate's pipeline journey.
   * 
   * This endpoint provides comprehensive details about a candidate's
   * progression through the pipeline including stage history and timeline.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param candidateId - The candidate identifier
   * @returns Object containing detailed pipeline journey information
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "candidateId": "candidate-456",
   *   "candidateName": "John Doe",
   *   "currentStage": "interview",
   *   "pipelineStages": [
   *     {
   *       "stage": "sourcing",
   *       "enteredAt": "2024-01-10T09:00:00Z",
   *       "exitedAt": "2024-01-12T14:30:00Z",
   *       "duration": "2 days 5 hours",
   *       "status": "completed"
   *     },
   *     {
   *       "stage": "screening",
   *       "enteredAt": "2024-01-12T14:30:00Z",
   *       "exitedAt": "2024-01-15T10:30:00Z",
   *       "duration": "2 days 20 hours",
   *       "status": "completed"
   *     },
   *     {
   *       "stage": "interview",
   *       "enteredAt": "2024-01-15T10:30:00Z",
   *       "exitedAt": null,
   *       "duration": "5 days",
   *       "status": "active"
   *     }
   *   ],
   *   "totalTimeInPipeline": "10 days 1 hour",
   *   "nextStage": "final_interview"
   * }
   * ```
   */
  @Get("candidates/:candidateId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getCandidatePipelineJourney(@Param("tenantId") tenantId: string, @Param("candidateId") candidateId: string) {
    return this.service.getCandidatePipelineJourney(tenantId, candidateId);
  }

  /**
   * Updates pipeline stage configuration and rules.
   * 
   * This endpoint allows modification of pipeline stages including
   * stage names, transition rules, and automation settings.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing pipeline configuration
   * @param body.stages - Array of pipeline stages with configuration
   * @param body.transitionRules - Rules for stage transitions
   * @param body.automationSettings - Automation configuration
   * @returns Object containing updated pipeline configuration
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "stages": [
   *     {
   *       "name": "sourcing",
   *       "displayName": "Candidate Sourcing",
   *       "order": 1,
   *       "autoAdvance": false,
   *       "slaHours": 24
   *     },
   *     {
   *       "name": "screening",
   *       "displayName": "Initial Screening",
   *       "order": 2,
   *       "autoAdvance": true,
   *       "slaHours": 48
   *     }
   *   ],
   *   "transitionRules": {
   *     "sourcing_to_screening": {
   *       "conditions": ["candidate_qualified"],
   *       "autoTrigger": true
   *     }
   *   }
   * }
   * ```
   */
  @Put("configuration")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  updatePipelineConfiguration(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      stages: Array<{ name: string; displayName: string; order: number; autoAdvance: boolean; slaHours: number }>; 
      transitionRules: Record<string, any>; 
      automationSettings: Record<string, any> 
    }
  ) {
    return this.service.updatePipelineConfiguration(tenantId, body.stages, body.transitionRules, body.automationSettings);
  }

  /**
   * Retrieves pipeline analytics and performance metrics.
   * 
   * This endpoint provides comprehensive analytics including
   * stage conversion rates, time-to-hire metrics, and bottleneck analysis.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for analytics
   * @param query.period - Time period for analytics (7d, 30d, 90d)
   * @param query.requirementId - Filter by specific requirement
   * @param query.includeBottlenecks - Whether to include bottleneck analysis
   * @returns Object containing pipeline analytics and metrics
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "totalCandidates": 150,
   *     "activeCandidates": 45,
   *     "avgTimeToHire": "21 days",
   *     "conversionRate": 0.12
   *   },
   *   "stageMetrics": [
   *     {
   *       "stage": "sourcing",
   *       "candidatesIn": 150,
   *       "candidatesOut": 120,
   *       "conversionRate": 0.80,
   *       "avgTimeInStage": "3 days"
   *     },
   *     {
   *       "stage": "screening",
   *       "candidatesIn": 120,
   *       "candidatesOut": 60,
   *       "conversionRate": 0.50,
   *       "avgTimeInStage": "5 days"
   *     }
   *   ],
   *   "bottlenecks": [
   *     {
   *       "stage": "interview",
   *       "issue": "High time in stage",
   *       "avgTime": "8 days",
   *       "recommendation": "Increase interviewer availability"
   *     }
   *   ]
   * }
   * ```
   */
  @Get("analytics")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getPipelineAnalytics(
    @Param("tenantId") tenantId: string,
    @Query("period") period?: string,
    @Query("requirementId") requirementId?: string,
    @Query("includeBottlenecks") includeBottlenecks?: string
  ) {
    return this.service.getPipelineAnalytics(tenantId, period, requirementId, includeBottlenecks);
  }

  /**
   * Rejects a candidate and removes them from the pipeline.
   * 
   * This endpoint handles candidate rejection with proper
   * notification and feedback collection.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param candidateId - The candidate identifier
   * @param body - Request body containing rejection details
   * @param body.reason - Reason for rejection
   * @param body.feedback - Detailed feedback for the candidate
   * @param body.stage - Stage where rejection occurred
   * @param body.notifyCandidate - Whether to notify the candidate
   * @returns Object containing rejection confirmation and details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "reason": "Insufficient technical skills",
   *   "feedback": "Candidate showed good communication but lacked required React experience",
   *   "stage": "technical_interview",
   *   "notifyCandidate": true
   * }
   * 
   * // Response format
   * {
   *   "candidateId": "candidate-456",
   *   "status": "REJECTED",
   *   "reason": "Insufficient technical skills",
   *   "stage": "technical_interview",
   *   "rejectedAt": "2024-01-15T16:00:00Z",
   *   "notificationSent": true
   * }
   * ```
   */
  @Post("candidates/:candidateId/reject")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  rejectCandidate(
    @Param("tenantId") tenantId: string,
    @Param("candidateId") candidateId: string,
    @Body() body: { reason: string; feedback: string; stage: string; notifyCandidate: boolean }
  ) {
    return this.service.rejectCandidate(tenantId, candidateId, body.reason, body.feedback, body.stage, body.notifyCandidate);
  }

  /**
   * Creates a custom pipeline stage for specific requirements.
   * 
   * This endpoint allows creation of custom pipeline stages
   * tailored to specific client or requirement needs.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing custom stage details
   * @param body.name - Stage name
   * @param body.displayName - Display name for the stage
   * @param body.description - Stage description
   * @param body.order - Stage order in pipeline
   * @param body.requirementId - Associated requirement ID
   * @param body.slaHours - SLA hours for the stage
   * @returns Object containing created stage details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "name": "client_interview",
   *   "displayName": "Client Interview",
   *   "description": "Final interview with client stakeholders",
   *   "order": 4,
   *   "requirementId": "req-123",
   *   "slaHours": 72
   * }
   * 
   * // Response format
   * {
   *   "stageId": "stage-789",
   *   "name": "client_interview",
   *   "displayName": "Client Interview",
   *   "description": "Final interview with client stakeholders",
   *   "order": 4,
   *   "requirementId": "req-123",
   *   "slaHours": 72,
   *   "createdAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post("stages")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  createCustomStage(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      name: string; 
      displayName: string; 
      description: string; 
      order: number; 
      requirementId?: string; 
      slaHours: number 
    }
  ) {
    return this.service.createCustomStage(tenantId, body.name, body.displayName, body.description, body.order, body.requirementId, body.slaHours);
  }
}
