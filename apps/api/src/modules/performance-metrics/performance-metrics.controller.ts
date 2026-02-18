/**
 * @fileoverview Performance Metrics Controller
 * 
 * This controller provides performance metrics and KPI tracking endpoints for the CRM BenchSales AI Integration application.
 * It handles SLA monitoring, conversion rate tracking, and productivity analytics.
 * 
 * Key features:
 * - SLA monitoring and alerting
 * - Conversion rate tracking
 * - Recruiter productivity metrics
 * - Client satisfaction scoring
 * - Performance benchmarking
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
import { PerformanceMetricsService } from "./performance-metrics.service";

/**
 * Controller for performance metrics and KPI tracking functionality.
 * 
 * This controller provides endpoints for monitoring SLAs, tracking conversion rates,
 * and analyzing productivity metrics with comprehensive reporting capabilities.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Get SLA metrics
 * GET /tenants/{tenantId}/performance-metrics/sla
 * 
 * // Get conversion rates
 * GET /tenants/{tenantId}/performance-metrics/conversion
 * 
 * // Get recruiter productivity
 * GET /tenants/{tenantId}/performance-metrics/productivity
 * ```
 */
@Controller("tenants/:tenantId/performance-metrics")
export class PerformanceMetricsController {
  /**
   * Initializes the performance metrics controller with the service dependency.
   * 
   * @param service - The performance metrics service for business logic
   */
  constructor(private readonly service: PerformanceMetricsService) {}

  /**
   * Retrieves SLA (Service Level Agreement) metrics and compliance data.
   * 
   * This endpoint provides comprehensive SLA monitoring including response times,
   * resolution rates, and compliance status across different service areas.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for SLA metrics
   * @param query.period - Time period for metrics (7d, 30d, 90d)
   * @param query.serviceType - Type of service to analyze
   * @param query.includeAlerts - Whether to include SLA alerts
   * @returns Object containing SLA metrics and compliance data
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "overallCompliance": 0.95,
   *     "totalSLAs": 150,
   *     "compliantSLAs": 143,
   *     "breachedSLAs": 7
   *   },
   *   "byService": {
   *     "candidateResponse": {
   *       "target": "24 hours",
   *       "actual": "18 hours",
   *       "compliance": 0.98
   *     },
   *     "clientResponse": {
   *       "target": "4 hours",
   *       "actual": "3.5 hours",
   *       "compliance": 0.92
   *     }
   *   },
   *   "alerts": [
   *     {
   *       "id": "alert-123",
   *       "type": "SLA_BREACH",
   *       "service": "candidateResponse",
   *       "severity": "HIGH",
   *       "message": "Response time exceeded 24 hours for 3 candidates"
   *     }
   *   ]
   * }
   * ```
   */
  @Get("sla")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getSlaMetrics(
    @Param("tenantId") tenantId: string,
    @Query("period") period?: string,
    @Query("serviceType") serviceType?: string,
    @Query("includeAlerts") includeAlerts?: string
  ) {
    return this.service.getSlaMetrics(tenantId, period, serviceType, includeAlerts);
  }

  /**
   * Retrieves conversion rate metrics across the recruitment pipeline.
   * 
   * This endpoint provides detailed conversion analytics from initial contact
   * through placement with funnel analysis and optimization insights.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for conversion metrics
   * @param query.period - Time period for metrics (7d, 30d, 90d)
   * @param query.pipelineStage - Specific pipeline stage to analyze
   * @param query.includeFunnel - Whether to include funnel breakdown
   * @returns Object containing conversion rate metrics and funnel data
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "overallConversion": 0.12,
   *     "totalCandidates": 500,
   *     "placements": 60,
   *     "avgTimeToPlace": "21 days"
   *   },
   *   "funnel": [
   *     {
   *       "stage": "Initial Contact",
   *       "count": 500,
   *       "conversionRate": 1.0
   *     },
   *     {
   *       "stage": "Response",
   *       "count": 350,
   *       "conversionRate": 0.70
   *     },
   *     {
   *       "stage": "Interview",
   *       "count": 120,
   *       "conversionRate": 0.34
   *     },
   *     {
   *       "stage": "Placement",
   *       "count": 60,
       *       "conversionRate": 0.50
   *     }
   *   ],
   *   "bySource": {
   *     "linkedin": { "conversion": 0.15, "volume": 200 },
   *     "referral": { "conversion": 0.25, "volume": 100 },
   *     "job_board": { "conversion": 0.08, "volume": 200 }
   *   }
   * }
   * ```
   */
  @Get("conversion")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getConversionMetrics(
    @Param("tenantId") tenantId: string,
    @Query("period") period?: string,
    @Query("pipelineStage") pipelineStage?: string,
    @Query("includeFunnel") includeFunnel?: string
  ) {
    return this.service.getConversionMetrics(tenantId, period, pipelineStage, includeFunnel);
  }

  /**
   * Retrieves recruiter productivity metrics and performance data.
   * 
   * This endpoint provides individual and team productivity analytics
   * including activity levels, success rates, and efficiency metrics.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for productivity metrics
   * @param query.period - Time period for metrics (7d, 30d, 90d)
   * @param query.recruiterId - Specific recruiter to analyze
   * @param query.includeTeam - Whether to include team comparisons
   * @returns Object containing productivity metrics and performance data
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "avgCandidatesPerDay": 8.5,
   *     "avgPlacementsPerMonth": 3.2,
   *     "avgResponseTime": "2.5 hours",
   *     "totalActiveRecruiters": 12
   *   },
   *   "byRecruiter": [
   *     {
   *       "recruiterId": "recruiter-123",
   *       "name": "John Smith",
   *       "candidatesContacted": 85,
   *       "placements": 4,
   *       "conversionRate": 0.15,
   *       "avgResponseTime": "1.8 hours",
   *       "satisfactionScore": 4.8
   *     }
   *   ],
   *   "teamMetrics": {
   *     "topPerformer": "John Smith",
   *     "avgTeamConversion": 0.12,
   *     "teamSatisfaction": 4.6
   *   }
   * }
   * ```
   */
  @Get("productivity")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getProductivityMetrics(
    @Param("tenantId") tenantId: string,
    @Query("period") period?: string,
    @Query("recruiterId") recruiterId?: string,
    @Query("includeTeam") includeTeam?: string
  ) {
    return this.service.getProductivityMetrics(tenantId, period, recruiterId, includeTeam);
  }

  /**
   * Retrieves client satisfaction metrics and feedback data.
   * 
   * This endpoint provides comprehensive client satisfaction analytics
   * including NPS scores, feedback trends, and service quality metrics.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for satisfaction metrics
   * @param query.period - Time period for metrics (7d, 30d, 90d)
   * @param query.clientId - Specific client to analyze
   * @param query.includeFeedback - Whether to include detailed feedback
   * @returns Object containing satisfaction metrics and feedback data
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "npsScore": 45,
   *     "avgSatisfaction": 4.6,
   *     "totalResponses": 150,
   *     "responseRate": 0.75
   *   },
   *   "byClient": [
   *     {
   *       "clientId": "client-123",
   *       "clientName": "Tech Corp",
   *       "satisfactionScore": 4.8,
   *       "npsScore": 50,
   *       "feedbackCount": 25,
   *       "lastFeedback": "2024-01-15T10:00:00Z"
   *     }
   *   ],
   *   "feedback": [
   *     {
   *       "id": "feedback-123",
   *       "clientName": "Tech Corp",
   *       "rating": 5,
   *       "comment": "Excellent service and quick response times",
   *       "date": "2024-01-15T10:00:00Z"
   *     }
   *   ]
   * }
   * ```
   */
  @Get("satisfaction")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getSatisfactionMetrics(
    @Param("tenantId") tenantId: string,
    @Query("period") period?: string,
    @Query("clientId") clientId?: string,
    @Query("includeFeedback") includeFeedback?: string
  ) {
    return this.service.getSatisfactionMetrics(tenantId, period, clientId, includeFeedback);
  }

  /**
   * Retrieves performance benchmarking data against industry standards.
   * 
   * This endpoint provides comparative analytics against industry benchmarks
   * and best practices for performance optimization.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for benchmarking
   * @param query.metricType - Type of metrics to benchmark
   * @param query.industry - Industry sector for comparison
   * @param query.includeRecommendations - Whether to include improvement recommendations
   * @returns Object containing benchmarking data and recommendations
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "benchmarks": {
   *     "conversionRate": {
   *       "current": 0.12,
   *       "industry": 0.15,
   *       "topQuartile": 0.22,
   *       "performance": "BELOW_AVERAGE"
   *     },
   *     "responseTime": {
   *       "current": "2.5 hours",
   *       "industry": "4 hours",
   *       "topQuartile": "1 hour",
   *       "performance": "ABOVE_AVERAGE"
   *     }
   *   },
   *   "recommendations": [
   *     {
   *       "metric": "conversionRate",
   *       "priority": "HIGH",
   *       "recommendation": "Improve candidate screening process",
   *       "expectedImpact": "+0.03 conversion rate"
   *     }
   *   ]
   * }
   * ```
   */
  @Get("benchmarks")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getBenchmarks(
    @Param("tenantId") tenantId: string,
    @Query("metricType") metricType?: string,
    @Query("industry") industry?: string,
    @Query("includeRecommendations") includeRecommendations?: string
  ) {
    return this.service.getBenchmarks(tenantId, metricType, industry, includeRecommendations);
  }

  /**
   * Creates a performance alert for monitoring specific metrics.
   * 
   * This endpoint sets up automated alerts for performance thresholds
   * with notification preferences and escalation rules.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing alert configuration
   * @param body.metricType - Type of metric to monitor
   * @param body.threshold - Alert threshold value
   * @param body.condition - Alert condition (above, below, equals)
   * @param body.notificationChannels - Notification channels (email, slack, etc.)
   * @param body.recipients - Alert recipients
   * @returns Object containing alert configuration and status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "metricType": "conversionRate",
   *   "threshold": 0.10,
   *   "condition": "below",
   *   "notificationChannels": ["email", "slack"],
   *   "recipients": ["manager@company.com", "#recruiting-team"]
   * }
   * 
   * // Response format
   * {
   *   "alertId": "alert-456",
   *   "status": "ACTIVE",
   *   "metricType": "conversionRate",
   *   "threshold": 0.10,
   *   "condition": "below",
   *   "createdAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post("alerts")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  createAlert(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      metricType: string; 
      threshold: number; 
      condition: string; 
      notificationChannels: string[]; 
      recipients: string[] 
    }
  ) {
    return this.service.createAlert(tenantId, body.metricType, body.threshold, body.condition, body.notificationChannels, body.recipients);
  }
}
