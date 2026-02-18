/**
 * @fileoverview AI Talent Sourcing Controller
 * 
 * This controller provides AI-powered talent sourcing endpoints for the CRM BenchSales AI Integration application.
 * It handles intelligent candidate discovery, enrichment, and matching capabilities.
 * 
 * Key features:
 * - AI-powered candidate discovery
 * - Profile enrichment and data enhancement
 * - Intelligent matching algorithms
 * - Source tracking and attribution
 * - Performance analytics
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
import { AiTalentSourcingService } from "./ai-talent-sourcing.service";

/**
 * Controller for AI-powered talent sourcing functionality.
 * 
 * This controller provides endpoints for intelligent candidate discovery,
 * profile enrichment, and matching with advanced AI algorithms.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Discover candidates for a requirement
 * POST /tenants/{tenantId}/ai-talent-sourcing/discover
 * {
 *   "requirementId": "req-123",
 *   "searchCriteria": { "skills": ["React", "Node.js"], "location": "Remote" }
 * }
 * 
 * // Enrich candidate profile
 * POST /tenants/{tenantId}/ai-talent-sourcing/enrich
 * {
 *   "candidateId": "candidate-456",
 *   "sources": ["linkedin", "github", "portfolio"]
 * }
 * ```
 */
@Controller("tenants/:tenantId/ai-talent-sourcing")
export class AiTalentSourcingController {
  /**
   * Initializes the AI talent sourcing controller with the service dependency.
   * 
   * @param service - The AI talent sourcing service for business logic
   */
  constructor(private readonly service: AiTalentSourcingService) {}

  /**
   * Discovers candidates using AI-powered search algorithms.
   * 
   * This endpoint uses advanced AI algorithms to discover potential candidates
   * based on requirement criteria and search parameters.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing discovery parameters
   * @param body.requirementId - The requirement ID to source candidates for
   * @param body.searchCriteria - Search criteria for candidate discovery
   * @param body.maxResults - Maximum number of candidates to discover
   * @param body.sources - Data sources to search (linkedin, github, etc.)
   * @returns Object containing discovered candidates and metadata
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "requirementId": "req-123",
   *   "searchCriteria": {
   *     "skills": ["React", "Node.js"],
   *     "location": "Remote",
   *     "experience": "3+ years"
   *   },
   *   "maxResults": 50,
   *   "sources": ["linkedin", "github", "portfolio"]
   * }
   * 
   * // Response format
   * {
   *   "discoveryId": "discovery-456",
   *   "candidates": [
   *     {
   *       "id": "candidate-789",
   *       "name": "John Doe",
   *       "title": "Senior React Developer",
   *       "location": "Remote",
   *       "matchScore": 0.92,
   *       "sources": ["linkedin", "github"]
   *     }
   *   ],
   *   "totalFound": 45,
   *   "searchTime": "2.3 seconds"
   * }
   * ```
   */
  @Post("discover")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  discoverCandidates(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      requirementId: string; 
      searchCriteria: Record<string, any>; 
      maxResults: number; 
      sources: string[] 
    }
  ) {
    return this.service.discoverCandidates(tenantId, body.requirementId, body.searchCriteria, body.maxResults, body.sources);
  }

  /**
   * Enriches candidate profiles with additional data from various sources.
   * 
   * This endpoint enhances candidate profiles by gathering additional information
   * from multiple data sources and platforms.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing enrichment parameters
   * @param body.candidateId - The candidate ID to enrich
   * @param body.sources - Data sources to use for enrichment
   * @param body.includeSocial - Whether to include social media data
   * @returns Object containing enriched candidate data
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "candidateId": "candidate-456",
   *   "sources": ["linkedin", "github", "portfolio"],
   *   "includeSocial": true
   * }
   * 
   * // Response format
   * {
   *   "candidateId": "candidate-456",
   *   "enrichedData": {
   *     "linkedin": {
   *       "profileUrl": "https://linkedin.com/in/johndoe",
   *       "connections": 500,
   *       "endorsements": 25
   *     },
   *     "github": {
   *       "username": "johndoe",
   *       "repositories": 15,
   *       "contributions": 1200
   *     }
   *   },
   *   "confidence": 0.95,
   *   "lastUpdated": "2024-01-15T10:30:00Z"
   * }
   * ```
   */
  @Post("enrich")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  enrichCandidate(
    @Param("tenantId") tenantId: string,
    @Body() body: { candidateId: string; sources: string[]; includeSocial: boolean }
  ) {
    return this.service.enrichCandidate(tenantId, body.candidateId, body.sources, body.includeSocial);
  }

  /**
   * Performs intelligent matching between candidates and requirements.
   * 
   * This endpoint uses AI algorithms to match candidates with requirements
   * based on skills, experience, location, and other criteria.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing matching parameters
   * @param body.requirementId - The requirement ID to match against
   * @param body.candidateIds - Array of candidate IDs to match
   * @param body.matchingCriteria - Criteria weights for matching
   * @returns Object containing match results and scores
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "requirementId": "req-123",
   *   "candidateIds": ["candidate-1", "candidate-2"],
   *   "matchingCriteria": {
   *     "skills": 0.4,
   *     "experience": 0.3,
   *     "location": 0.2,
   *     "availability": 0.1
   *   }
   * }
   * 
   * // Response format
   * {
   *   "matches": [
   *     {
   *       "candidateId": "candidate-1",
   *       "matchScore": 0.92,
   *       "breakdown": {
   *         "skills": 0.95,
   *         "experience": 0.90,
   *         "location": 0.85,
   *         "availability": 1.0
   *       },
   *       "recommendation": "STRONG_MATCH"
   *     }
   *   ],
   *   "totalMatches": 2
   * }
   * ```
   */
  @Post("match")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  matchCandidates(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      requirementId: string; 
      candidateIds: string[]; 
      matchingCriteria: Record<string, number> 
    }
  ) {
    return this.service.matchCandidates(tenantId, body.requirementId, body.candidateIds, body.matchingCriteria);
  }

  /**
   * Retrieves sourcing performance analytics and metrics.
   * 
   * This endpoint provides insights into sourcing effectiveness including
   * discovery rates, enrichment success, and matching accuracy.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for analytics
   * @param query.period - Time period for analytics (7d, 30d, 90d)
   * @param query.metricType - Type of metrics to retrieve
   * @returns Object containing sourcing analytics and metrics
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "totalDiscovered": 500,
   *     "enrichmentSuccess": 0.85,
   *     "avgMatchScore": 0.78,
   *     "conversionRate": 0.12
   *   },
   *   "bySource": {
   *     "linkedin": { "discovered": 300, "enriched": 250, "matched": 45 },
   *     "github": { "discovered": 200, "enriched": 180, "matched": 35 }
   *   },
   *   "trends": [
   *     {
   *       "date": "2024-01-15",
   *       "discovered": 25,
   *       "enriched": 20,
   *       "matched": 5
   *     }
   *   ]
   * }
   * ```
   */
  @Get("analytics")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getAnalytics(
    @Param("tenantId") tenantId: string,
    @Query("period") period?: string,
    @Query("metricType") metricType?: string
  ) {
    return this.service.getAnalytics(tenantId, period, metricType);
  }

  /**
   * Retrieves active sourcing jobs and their current status.
   * 
   * This endpoint provides real-time status of all active discovery,
   * enrichment, and matching jobs for monitoring and management.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering jobs
   * @param query.jobType - Type of jobs to retrieve (discovery, enrichment, matching)
   * @param query.status - Job status filter
   * @returns Array of active sourcing jobs with their current status
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "jobId": "discovery-job-456",
   *     "type": "DISCOVERY",
   *     "status": "IN_PROGRESS",
   *     "progress": 0.75,
   *     "candidatesFound": 35,
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

  /**
   * Retrieves source attribution and tracking information.
   * 
   * This endpoint provides detailed information about candidate sources
   * and attribution for tracking sourcing effectiveness.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for source tracking
   * @param query.candidateId - Optional candidate ID for specific tracking
   * @param query.source - Optional source filter
   * @returns Object containing source attribution and tracking data
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "sources": [
   *     {
   *       "name": "linkedin",
   *       "candidatesFound": 300,
   *       "enrichmentSuccess": 0.90,
   *       "avgMatchScore": 0.82,
   *       "cost": 0.05
   *     }
   *   ],
   *   "attribution": {
   *     "totalSources": 5,
   *     "primarySource": "linkedin",
   *     "sourceDiversity": 0.75
   *   }
   * }
   * ```
   */
  @Get("sources")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getSourceAttribution(
    @Param("tenantId") tenantId: string,
    @Query("candidateId") candidateId?: string,
    @Query("source") source?: string
  ) {
    return this.service.getSourceAttribution(tenantId, candidateId, source);
  }
}
