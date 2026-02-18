/**
 * @fileoverview AI Recruiter Agent Controller
 * 
 * This controller provides AI-powered recruiter agent endpoints for the CRM BenchSales AI Integration application.
 * It handles automated sourcing, screening, and outreach with intelligent conversation management.
 * 
 * Key features:
 * - Automated candidate sourcing and screening
 * - Intelligent conversation management
 * - AI-powered outreach and follow-up
 * - Performance tracking and optimization
 * - Role-based access control for different user types
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { AiRecruiterAgentService } from "./ai-recruiter-agent.service";

/**
 * Controller for AI-powered recruiter agent functionality.
 * 
 * This controller provides endpoints for automated sourcing, screening,
 * and outreach capabilities with intelligent conversation management.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Start automated sourcing for a requirement
 * POST /tenants/{tenantId}/ai-recruiter-agent/source
 * {
 *   "requirementId": "req-123",
 *   "maxCandidates": 50,
 *   "screeningCriteria": ["5+ years experience", "React expertise"]
 * }
 * 
 * // Get agent performance metrics
 * GET /tenants/{tenantId}/ai-recruiter-agent/performance
 * ```
 */
@Controller("tenants/:tenantId/ai-recruiter-agent")
export class AiRecruiterAgentController {
  /**
   * Initializes the AI recruiter agent controller with the service dependency.
   * 
   * @param service - The AI recruiter agent service for business logic
   */
  constructor(private readonly service: AiRecruiterAgentService) {}

  /**
   * Starts automated candidate sourcing for a specific requirement.
   * 
   * This endpoint initiates AI-powered candidate sourcing based on the
   * requirement criteria and screening parameters provided.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing sourcing parameters
   * @param body.requirementId - The requirement ID to source candidates for
   * @param body.maxCandidates - Maximum number of candidates to source
   * @param body.screeningCriteria - Array of screening criteria
   * @returns Object containing sourcing job details and status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "requirementId": "req-123",
   *   "maxCandidates": 50,
   *   "screeningCriteria": ["5+ years experience", "React expertise"]
   * }
   * 
   * // Response format
   * {
   *   "jobId": "sourcing-job-456",
   *   "status": "STARTED",
   *   "estimatedCompletion": "2024-01-15T10:30:00Z"
   * }
   * ```
   */
  @Post("source")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  startSourcing(
    @Param("tenantId") tenantId: string,
    @Body() body: { requirementId: string; maxCandidates: number; screeningCriteria: string[] }
  ) {
    return this.service.startSourcing(tenantId, body.requirementId, body.maxCandidates, body.screeningCriteria);
  }

  /**
   * Initiates automated screening for sourced candidates.
   * 
   * This endpoint starts AI-powered screening of candidates based on
   * predefined criteria and requirement specifications.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing screening parameters
   * @param body.candidateIds - Array of candidate IDs to screen
   * @param body.screeningQuestions - Custom screening questions
   * @returns Object containing screening job details and status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "candidateIds": ["candidate-1", "candidate-2"],
   *   "screeningQuestions": ["What is your React experience?", "Are you available for remote work?"]
   * }
   * 
   * // Response format
   * {
   *   "jobId": "screening-job-789",
   *   "status": "STARTED",
   *   "candidatesCount": 2
   * }
   * ```
   */
  @Post("screen")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  startScreening(
    @Param("tenantId") tenantId: string,
    @Body() body: { candidateIds: string[]; screeningQuestions: string[] }
  ) {
    return this.service.startScreening(tenantId, body.candidateIds, body.screeningQuestions);
  }

  /**
   * Initiates automated outreach to candidates.
   * 
   * This endpoint starts AI-powered outreach campaigns to engage
   * with screened candidates through personalized messaging.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing outreach parameters
   * @param body.candidateIds - Array of candidate IDs to contact
   * @param body.messageTemplate - Custom message template
   * @param body.followUpSchedule - Follow-up schedule configuration
   * @returns Object containing outreach campaign details and status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "candidateIds": ["candidate-1", "candidate-2"],
   *   "messageTemplate": "Hi {name}, we have an exciting opportunity...",
   *   "followUpSchedule": { "days": [3, 7, 14], "maxAttempts": 3 }
   * }
   * 
   * // Response format
   * {
   *   "campaignId": "outreach-campaign-101",
   *   "status": "STARTED",
   *   "candidatesCount": 2
   * }
   * ```
   */
  @Post("outreach")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  startOutreach(
    @Param("tenantId") tenantId: string,
    @Body() body: { candidateIds: string[]; messageTemplate: string; followUpSchedule: { days: number[]; maxAttempts: number } }
  ) {
    return this.service.startOutreach(tenantId, body.candidateIds, body.messageTemplate, body.followUpSchedule);
  }

  /**
   * Retrieves agent performance metrics and statistics.
   * 
   * This endpoint provides comprehensive performance data including
   * sourcing success rates, screening accuracy, and outreach effectiveness.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering metrics
   * @param query.period - Time period for metrics (e.g., "7d", "30d", "90d")
   * @param query.metricType - Type of metrics to retrieve
   * @returns Object containing performance metrics and statistics
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "sourcing": {
   *     "totalCandidates": 150,
   *     "successRate": 0.85,
   *     "avgTimeToSource": "2.5 hours"
   *   },
   *   "screening": {
   *     "totalScreened": 120,
   *     "accuracy": 0.92,
   *     "avgScreeningTime": "15 minutes"
   *   },
   *   "outreach": {
   *     "totalSent": 100,
   *     "responseRate": 0.35,
   *     "conversionRate": 0.12
   *   }
   * }
   * ```
   */
  @Get("performance")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getPerformance(
    @Param("tenantId") tenantId: string,
    @Query("period") period?: string,
    @Query("metricType") metricType?: string
  ) {
    return this.service.getPerformance(tenantId, period, metricType);
  }

  /**
   * Retrieves active agent jobs and their current status.
   * 
   * This endpoint provides real-time status of all active sourcing,
   * screening, and outreach jobs for monitoring and management.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering jobs
   * @param query.jobType - Type of jobs to retrieve (sourcing, screening, outreach)
   * @param query.status - Job status filter
   * @returns Array of active jobs with their current status
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "jobId": "sourcing-job-456",
   *     "type": "SOURCING",
   *     "status": "IN_PROGRESS",
   *     "progress": 0.75,
   *     "startedAt": "2024-01-15T09:00:00Z"
   *   }
   * ]
   * ```
   */
  @Get("jobs")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getActiveJobs(
    @Param("tenantId") tenantId: string,
    @Query("jobType") jobType?: string,
    @Query("status") status?: string
  ) {
    return this.service.getActiveJobs(tenantId, jobType, status);
  }
}
