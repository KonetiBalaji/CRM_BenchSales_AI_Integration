/**
 * @fileoverview Job Posting Management Controller
 * 
 * This controller provides job posting management endpoints for the CRM BenchSales AI Integration application.
 * It handles job creation, distribution, tracking, and optimization capabilities.
 * 
 * Key features:
 * - Multi-platform job posting
 * - Job board integration
 * - Application tracking
 * - Performance analytics
 * - ATS integration
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
import { JobPostingManagementService } from "./job-posting-management.service";

/**
 * Controller for job posting management functionality.
 * 
 * This controller provides endpoints for creating, managing, and tracking
 * job postings across multiple platforms with comprehensive analytics.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Create a new job posting
 * POST /tenants/{tenantId}/job-postings
 * {
 *   "title": "Senior React Developer",
 *   "description": "We are looking for...",
 *   "platforms": ["linkedin", "indeed", "glassdoor"]
 * }
 * 
 * // Get job posting analytics
 * GET /tenants/{tenantId}/job-postings/{jobId}/analytics
 * ```
 */
@Controller("tenants/:tenantId/job-postings")
export class JobPostingManagementController {
  /**
   * Initializes the job posting management controller with the service dependency.
   * 
   * @param service - The job posting management service for business logic
   */
  constructor(private readonly service: JobPostingManagementService) {}

  /**
   * Creates a new job posting with specified details.
   * 
   * This endpoint creates a new job posting and distributes it across
   * selected platforms with proper formatting and optimization.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing job posting details
   * @param body.title - Job title
   * @param body.description - Job description
   * @param body.requirements - Job requirements and qualifications
   * @param body.location - Job location
   * @param body.salary - Salary range information
   * @param body.platforms - Target platforms for posting
   * @param body.requirementId - Associated requirement ID
   * @returns Object containing job posting details and status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "title": "Senior React Developer",
   *   "description": "We are looking for a Senior React Developer with 5+ years experience...",
   *   "requirements": ["5+ years React experience", "Node.js knowledge", "Team leadership"],
   *   "location": "Remote",
   *   "salary": { "min": 120000, "max": 150000, "currency": "USD" },
   *   "platforms": ["linkedin", "indeed", "glassdoor"],
   *   "requirementId": "req-123"
   * }
   * 
   * // Response format
   * {
   *   "jobId": "job-456",
   *   "title": "Senior React Developer",
   *   "status": "POSTED",
   *   "platforms": ["linkedin", "indeed", "glassdoor"],
   *   "postedAt": "2024-01-15T10:00:00Z",
   *   "applicationsCount": 0
   * }
   * ```
   */
  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  createJobPosting(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      title: string; 
      description: string; 
      requirements: string[]; 
      location: string; 
      salary: { min: number; max: number; currency: string }; 
      platforms: string[]; 
      requirementId: string 
    }
  ) {
    return this.service.createJobPosting(tenantId, body.title, body.description, body.requirements, body.location, body.salary, body.platforms, body.requirementId);
  }

  /**
   * Retrieves all job postings for the tenant.
   * 
   * This endpoint provides a list of all job postings with their
   * status, performance metrics, and application counts.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering and pagination
   * @param query.status - Job posting status filter
   * @param query.platform - Platform filter
   * @param query.requirementId - Filter by requirement ID
   * @param query.limit - Maximum number of job postings to return
   * @param query.offset - Number of job postings to skip
   * @returns Array of job postings with pagination info
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "jobId": "job-456",
   *     "title": "Senior React Developer",
   *     "status": "ACTIVE",
   *     "platforms": ["linkedin", "indeed"],
   *     "applicationsCount": 25,
   *     "views": 150,
   *     "postedAt": "2024-01-15T10:00:00Z"
   *   }
   * ]
   * ```
   */
  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getJobPostings(
    @Param("tenantId") tenantId: string,
    @Query("status") status?: string,
    @Query("platform") platform?: string,
    @Query("requirementId") requirementId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.service.getJobPostings(tenantId, status, platform, requirementId, limit, offset);
  }

  /**
   * Retrieves detailed information about a specific job posting.
   * 
   * This endpoint provides comprehensive details about a job posting
   * including performance metrics, applications, and platform status.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param jobId - The job posting identifier
   * @returns Object containing detailed job posting information
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "jobId": "job-456",
   *   "title": "Senior React Developer",
   *   "description": "We are looking for a Senior React Developer...",
   *   "requirements": ["5+ years React experience", "Node.js knowledge"],
   *   "location": "Remote",
   *   "salary": { "min": 120000, "max": 150000, "currency": "USD" },
   *   "status": "ACTIVE",
   *   "platforms": [
   *     {
   *       "name": "linkedin",
   *       "status": "POSTED",
   *       "url": "https://linkedin.com/jobs/view/123456",
   *       "views": 100,
   *       "applications": 15
   *     }
   *   ],
   *   "analytics": {
   *     "totalViews": 150,
   *     "totalApplications": 25,
   *     "conversionRate": 0.167,
   *     "avgTimeToApply": "3.2 days"
   *   }
   * }
   * ```
   */
  @Get(":jobId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getJobPosting(@Param("tenantId") tenantId: string, @Param("jobId") jobId: string) {
    return this.service.getJobPosting(tenantId, jobId);
  }

  /**
   * Updates an existing job posting.
   * 
   * This endpoint allows modification of job posting details including
   * description, requirements, and platform distribution.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param jobId - The job posting identifier
   * @param body - Request body containing updated job posting data
   * @returns Object containing updated job posting details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "title": "Senior React Developer (Updated)",
   *   "description": "Updated job description...",
   *   "salary": { "min": 130000, "max": 160000, "currency": "USD" }
   * }
   * ```
   */
  @Put(":jobId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  updateJobPosting(
    @Param("tenantId") tenantId: string,
    @Param("jobId") jobId: string,
    @Body() body: { title?: string; description?: string; requirements?: string[]; salary?: { min: number; max: number; currency: string } }
  ) {
    return this.service.updateJobPosting(tenantId, jobId, body);
  }

  /**
   * Retrieves comprehensive analytics for a specific job posting.
   * 
   * This endpoint provides detailed performance metrics including
   * views, applications, conversion rates, and platform breakdown.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param jobId - The job posting identifier
   * @param query - Query parameters for analytics
   * @param query.period - Time period for analytics (7d, 30d, 90d)
   * @param query.includeApplications - Whether to include application details
   * @returns Object containing job posting analytics and metrics
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "totalViews": 150,
   *     "totalApplications": 25,
   *     "conversionRate": 0.167,
   *     "avgTimeToApply": "3.2 days"
   *   },
   *   "byPlatform": {
   *     "linkedin": { "views": 100, "applications": 15, "conversionRate": 0.15 },
   *     "indeed": { "views": 50, "applications": 10, "conversionRate": 0.20 }
   *   },
   *   "trends": [
   *     {
   *       "date": "2024-01-15",
   *       "views": 25,
   *       "applications": 5
   *     }
   *   ],
   *   "applications": [
   *     {
   *       "applicationId": "app-123",
   *       "candidateName": "John Doe",
   *       "appliedAt": "2024-01-15T14:30:00Z",
   *       "source": "linkedin"
   *     }
   *   ]
   * }
   * ```
   */
  @Get(":jobId/analytics")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getJobPostingAnalytics(
    @Param("tenantId") tenantId: string,
    @Param("jobId") jobId: string,
    @Query("period") period?: string,
    @Query("includeApplications") includeApplications?: string
  ) {
    return this.service.getJobPostingAnalytics(tenantId, jobId, period, includeApplications);
  }

  /**
   * Pauses or resumes a job posting.
   * 
   * This endpoint allows toggling the active status of a job posting
   * across all platforms with proper synchronization.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param jobId - The job posting identifier
   * @param body - Request body containing status change
   * @param body.action - Action to perform (pause, resume, close)
   * @param body.reason - Optional reason for the action
   * @returns Object containing updated job posting status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "action": "pause",
   *   "reason": "Position filled, pausing applications"
   * }
   * 
   * // Response format
   * {
   *   "jobId": "job-456",
   *   "status": "PAUSED",
   *   "action": "pause",
   *   "reason": "Position filled, pausing applications",
   *   "updatedAt": "2024-01-15T15:00:00Z"
   * }
   * ```
   */
  @Put(":jobId/status")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  updateJobPostingStatus(
    @Param("tenantId") tenantId: string,
    @Param("jobId") jobId: string,
    @Body() body: { action: string; reason?: string }
  ) {
    return this.service.updateJobPostingStatus(tenantId, jobId, body.action, body.reason);
  }

  /**
   * Optimizes job posting for better performance.
   * 
   * This endpoint uses AI to analyze and optimize job posting content
   * for improved visibility and application rates.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param jobId - The job posting identifier
   * @param body - Request body containing optimization parameters
   * @param body.optimizeFor - Target optimization (views, applications, quality)
   * @param body.platforms - Specific platforms to optimize for
   * @returns Object containing optimization suggestions and improvements
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "optimizeFor": "applications",
   *   "platforms": ["linkedin", "indeed"]
   * }
   * 
   * // Response format
   * {
   *   "optimizationId": "opt-789",
   *   "suggestions": [
   *     {
   *       "type": "title",
   *       "current": "Senior React Developer",
   *       "suggested": "Senior React Developer - Remote - $120k-$150k",
   *       "impact": "Expected 25% increase in applications"
   *     }
   *   ],
   *   "confidence": 0.85,
   *   "estimatedImprovement": "25%"
   * }
   * ```
   */
  @Post(":jobId/optimize")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  optimizeJobPosting(
    @Param("tenantId") tenantId: string,
    @Param("jobId") jobId: string,
    @Body() body: { optimizeFor: string; platforms: string[] }
  ) {
    return this.service.optimizeJobPosting(tenantId, jobId, body.optimizeFor, body.platforms);
  }
}
