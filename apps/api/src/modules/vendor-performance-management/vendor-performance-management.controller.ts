/**
 * @fileoverview Vendor Performance Management Controller
 * 
 * This controller provides vendor performance management endpoints for the CRM BenchSales AI Integration application.
 * It handles performance tracking, evaluation, and vendor relationship management.
 * 
 * Key features:
 * - Vendor performance tracking
 * - Performance evaluation and scoring
 * - Vendor relationship management
 * - Performance analytics and reporting
 * - Vendor improvement recommendations
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
import { VendorPerformanceManagementService } from "./vendor-performance-management.service";

/**
 * Controller for vendor performance management functionality.
 * 
 * This controller provides endpoints for managing vendor performance tracking,
 * evaluation, and relationship management with comprehensive
 * analytics and improvement recommendations.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Create performance evaluation
 * POST /tenants/{tenantId}/vendor-performance/evaluations
 * {
 *   "vendorId": "vendor-123",
 *   "evaluationPeriod": "Q1-2024",
 *   "evaluatorId": "mgr-456"
 * }
 * 
 * // Submit performance feedback
 * POST /tenants/{tenantId}/vendor-performance/feedback
 * {
 *   "vendorId": "vendor-123",
 *   "rating": 4.2,
 *   "feedback": "Excellent service delivery"
 * }
 * ```
 */
@Controller("tenants/:tenantId/vendor-performance")
export class VendorPerformanceManagementController {
  /**
   * Initializes the vendor performance management controller with the service dependency.
   * 
   * @param service - The vendor performance management service for business logic
   */
  constructor(private readonly service: VendorPerformanceManagementService) {}

  /**
   * Creates a new vendor performance evaluation.
   * 
   * This endpoint initiates a comprehensive performance evaluation with
   * scoring criteria, feedback collection, and improvement recommendations.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing evaluation details
   * @param body.vendorId - The vendor identifier
   * @param body.evaluationPeriod - Evaluation period (e.g., Q1-2024, Annual-2024)
   * @param body.evaluatorId - ID of the evaluator/manager
   * @param body.evaluationType - Type of evaluation (quarterly, annual, project-based)
   * @param body.criteria - Performance evaluation criteria
   * @param body.projects - Projects to be evaluated
   * @returns Object containing evaluation details and status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "vendorId": "vendor-123",
   *   "evaluationPeriod": "Q1-2024",
   *   "evaluatorId": "mgr-456",
   *   "evaluationType": "quarterly",
   *   "criteria": [
   *     {
   *       "criterion": "service_quality",
   *       "weight": 0.3,
   *       "description": "Quality of services delivered"
   *     }
   *   ],
   *   "projects": [
   *     {
   *       "projectId": "proj-789",
   *       "projectName": "Website Development",
   *       "startDate": "2024-01-01",
   *       "endDate": "2024-03-31"
   *     }
   *   ]
   * }
   * 
   * // Response format
   * {
   *   "evaluationId": "eval-101",
   *   "vendorId": "vendor-123",
   *   "evaluationPeriod": "Q1-2024",
   *   "status": "IN_PROGRESS",
   *   "createdAt": "2024-01-15T10:00:00Z",
   *   "dueDate": "2024-01-30T17:00:00Z"
   * }
   * ```
   */
  @Post("evaluations")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  createPerformanceEvaluation(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      vendorId: string; 
      evaluationPeriod: string; 
      evaluatorId: string; 
      evaluationType: string; 
      criteria: Array<{ criterion: string; weight: number; description: string }>; 
      projects: Array<{ projectId: string; projectName: string; startDate: string; endDate: string }> 
    }
  ) {
    return this.service.createPerformanceEvaluation(tenantId, body.vendorId, body.evaluationPeriod, body.evaluatorId, body.evaluationType, body.criteria, body.projects);
  }

  /**
   * Retrieves all vendor performance evaluations for the tenant.
   * 
   * This endpoint provides a list of all performance evaluations with their
   * status, scores, and completion information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering and pagination
   * @param query.status - Evaluation status filter
   * @param query.vendorId - Filter by vendor ID
   * @param query.evaluationPeriod - Filter by evaluation period
   * @param query.limit - Maximum number of evaluations to return
   * @param query.offset - Number of evaluations to skip
   * @returns Array of performance evaluations with pagination info
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "evaluationId": "eval-101",
   *     "vendorName": "Tech Solutions Inc",
   *     "evaluationPeriod": "Q1-2024",
   *     "evaluationType": "quarterly",
   *     "status": "COMPLETED",
   *     "overallScore": 4.2,
   *     "createdAt": "2024-01-15T10:00:00Z",
   *     "completedAt": "2024-01-25T15:30:00Z"
   *   }
   * ]
   * ```
   */
  @Get("evaluations")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getPerformanceEvaluations(
    @Param("tenantId") tenantId: string,
    @Query("status") status?: string,
    @Query("vendorId") vendorId?: string,
    @Query("evaluationPeriod") evaluationPeriod?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.service.getPerformanceEvaluations(tenantId, status, vendorId, evaluationPeriod, limit, offset);
  }

  /**
   * Retrieves detailed information about a specific performance evaluation.
   * 
   * This endpoint provides comprehensive details about a performance evaluation
   * including scores, feedback, recommendations, and project assessments.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param evaluationId - The performance evaluation identifier
   * @returns Object containing detailed performance evaluation information
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "evaluationId": "eval-101",
   *   "vendor": {
   *     "id": "vendor-123",
   *     "name": "Tech Solutions Inc",
   *     "contactEmail": "contact@techsolutions.com",
   *     "businessType": "IT Services"
   *   },
   *   "evaluator": {
   *     "id": "mgr-456",
   *     "name": "Jane Smith",
   *     "position": "Vendor Manager"
   *   },
   *   "evaluationPeriod": "Q1-2024",
   *   "evaluationType": "quarterly",
   *   "status": "COMPLETED",
   *   "overallScore": 4.2,
   *   "criteriaScores": [
   *     {
   *       "criterion": "service_quality",
   *       "score": 4.5,
   *       "weight": 0.3,
   *       "feedback": "Excellent service quality"
   *     }
   *   ],
   *   "projectAssessments": [
   *     {
   *       "projectId": "proj-789",
   *       "projectName": "Website Development",
   *       "score": 4.0,
   *       "feedback": "Delivered on time with high quality"
   *     }
   *   ],
   *   "recommendations": [
   *     {
   *       "type": "improvement",
   *       "description": "Improve communication during project updates",
   *       "priority": "Medium"
   *     }
   *   ]
   * }
   * ```
   */
  @Get("evaluations/:evaluationId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getPerformanceEvaluation(@Param("tenantId") tenantId: string, @Param("evaluationId") evaluationId: string) {
    return this.service.getPerformanceEvaluation(tenantId, evaluationId);
  }

  /**
   * Submits performance feedback for a vendor.
   * 
   * This endpoint allows evaluators to submit detailed feedback,
   * scores, and recommendations for vendor performance.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing feedback details
   * @param body.vendorId - The vendor identifier
   * @param body.evaluationId - The evaluation identifier
   * @param body.overallRating - Overall performance rating (1-5)
   * @param body.criteriaRatings - Ratings for individual criteria
   * @param body.feedback - Detailed feedback text
   * @param body.strengths - Vendor strengths
   * @param body.areasForImprovement - Areas for improvement
   * @param body.recommendations - Improvement recommendations
   * @returns Object containing feedback submission confirmation
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "vendorId": "vendor-123",
   *   "evaluationId": "eval-101",
   *   "overallRating": 4.2,
   *   "criteriaRatings": [
   *     {
   *       "criterion": "service_quality",
   *       "rating": 4.5,
   *       "comments": "Excellent service quality"
   *     }
   *   ],
   *   "feedback": "Tech Solutions Inc has consistently delivered high-quality services...",
   *   "strengths": ["Technical expertise", "Timely delivery", "Good communication"],
   *   "areasForImprovement": ["Documentation", "Cost optimization"],
   *   "recommendations": ["Improve project documentation", "Provide cost breakdowns"]
   * }
   * 
   * // Response format
   * {
   *   "feedbackId": "feedback-456",
   *   "vendorId": "vendor-123",
   *   "evaluationId": "eval-101",
   *   "overallRating": 4.2,
   *   "status": "SUBMITTED",
   *   "submittedAt": "2024-01-25T15:30:00Z"
   * }
   * ```
   */
  @Post("feedback")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  submitPerformanceFeedback(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      vendorId: string; 
      evaluationId: string; 
      overallRating: number; 
      criteriaRatings: Array<{ criterion: string; rating: number; comments: string }>; 
      feedback: string; 
      strengths: string[]; 
      areasForImprovement: string[]; 
      recommendations: string[] 
    }
  ) {
    return this.service.submitPerformanceFeedback(tenantId, body.vendorId, body.evaluationId, body.overallRating, body.criteriaRatings, body.feedback, body.strengths, body.areasForImprovement, body.recommendations);
  }

  /**
   * Retrieves vendor performance analytics and metrics.
   * 
   * This endpoint provides comprehensive analytics including
   * performance trends, vendor rankings, and improvement insights.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for analytics
   * @param query.period - Time period for analytics (7d, 30d, 90d, 1y)
   * @param query.vendorId - Filter by specific vendor
   * @param query.includeTrends - Whether to include trend analysis
   * @returns Object containing vendor performance analytics and metrics
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "totalVendors": 25,
   *     "avgPerformanceScore": 4.1,
   *     "topPerformers": 8,
   *     "improvementNeeded": 3
   *   },
   *   "performanceDistribution": [
   *     {
   *       "scoreRange": "4.5-5.0",
   *       "vendorCount": 8,
   *       "percentage": 32
   *     },
   *     {
   *       "scoreRange": "4.0-4.4",
   *       "vendorCount": 12,
   *       "percentage": 48
   *     }
   *   ],
   *   "topPerformers": [
   *     {
   *       "vendorId": "vendor-123",
   *       "vendorName": "Tech Solutions Inc",
   *       "avgScore": 4.8,
   *       "totalProjects": 15
   *     }
   *   ],
   *   "trends": [
   *     {
   *       "period": "Q1-2024",
   *       "avgScore": 4.1,
   *       "totalEvaluations": 25
   *     }
   *   ]
   * }
   * ```
   */
  @Get("analytics")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getVendorPerformanceAnalytics(
    @Param("tenantId") tenantId: string,
    @Query("period") period?: string,
    @Query("vendorId") vendorId?: string,
    @Query("includeTrends") includeTrends?: string
  ) {
    return this.service.getVendorPerformanceAnalytics(tenantId, period, vendorId, includeTrends);
  }

  /**
   * Creates a vendor improvement plan.
   * 
   * This endpoint creates a structured improvement plan for vendors
   * based on performance evaluation results and feedback.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing improvement plan details
   * @param body.vendorId - The vendor identifier
   * @param body.evaluationId - The evaluation identifier
   * @param body.improvementAreas - Areas identified for improvement
   * @param body.actionItems - Specific action items for improvement
   * @param body.timeline - Timeline for improvement implementation
   * @param body.responsibleParty - Party responsible for implementation
   * @returns Object containing improvement plan details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "vendorId": "vendor-123",
   *   "evaluationId": "eval-101",
   *   "improvementAreas": ["Documentation", "Cost optimization"],
   *   "actionItems": [
   *     {
   *       "action": "Implement standardized documentation templates",
   *       "priority": "High",
   *       "dueDate": "2024-02-15"
   *     }
   *   ],
   *   "timeline": "3 months",
   *   "responsibleParty": "vendor"
   * }
   * 
   * // Response format
   * {
   *   "improvementPlanId": "plan-789",
   *   "vendorId": "vendor-123",
   *   "evaluationId": "eval-101",
   *   "status": "ACTIVE",
   *   "improvementAreas": ["Documentation", "Cost optimization"],
   *   "actionItems": [
   *     {
   *       "actionId": "action-1",
   *       "action": "Implement standardized documentation templates",
   *       "priority": "High",
   *       "dueDate": "2024-02-15",
   *       "status": "PENDING"
   *     }
   *   ],
   *   "timeline": "3 months",
   *   "createdAt": "2024-01-25T16:00:00Z"
   * }
   * ```
   */
  @Post("improvement-plans")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  createImprovementPlan(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      vendorId: string; 
      evaluationId: string; 
      improvementAreas: string[]; 
      actionItems: Array<{ action: string; priority: string; dueDate: string }>; 
      timeline: string; 
      responsibleParty: string 
    }
  ) {
    return this.service.createImprovementPlan(tenantId, body.vendorId, body.evaluationId, body.improvementAreas, body.actionItems, body.timeline, body.responsibleParty);
  }

  /**
   * Updates vendor performance metrics.
   * 
   * This endpoint allows updating vendor performance metrics including
   * project completion rates, quality scores, and delivery times.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param vendorId - The vendor identifier
   * @param body - Request body containing metric updates
   * @param body.metrics - Performance metrics to update
   * @param body.updatedBy - ID of the person updating metrics
   * @param body.notes - Optional notes for the update
   * @returns Object containing updated metrics confirmation
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "metrics": {
   *     "projectCompletionRate": 0.95,
   *     "qualityScore": 4.3,
   *     "avgDeliveryTime": "5 days",
   *     "customerSatisfaction": 4.5
   *   },
   *   "updatedBy": "mgr-456",
   *   "notes": "Updated based on Q1 project results"
   * }
   * 
   * // Response format
   * {
   *   "vendorId": "vendor-123",
   *   "metrics": {
   *     "projectCompletionRate": 0.95,
   *     "qualityScore": 4.3,
   *     "avgDeliveryTime": "5 days",
   *     "customerSatisfaction": 4.5
   *   },
   *   "updatedAt": "2024-01-25T16:30:00Z",
   *   "updatedBy": "mgr-456"
   * }
   * ```
   */
  @Put(":vendorId/metrics")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  updateVendorMetrics(
    @Param("tenantId") tenantId: string,
    @Param("vendorId") vendorId: string,
    @Body() body: { metrics: Record<string, any>; updatedBy: string; notes?: string }
  ) {
    return this.service.updateVendorMetrics(tenantId, vendorId, body.metrics, body.updatedBy, body.notes);
  }

  /**
   * Generates vendor performance report.
   * 
   * This endpoint generates comprehensive performance reports for vendors
   * including trends, comparisons, and actionable insights.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing report parameters
   * @param body.vendorId - The vendor identifier
   * @param body.reportPeriod - Period for the report
   * @param body.includeComparisons - Whether to include vendor comparisons
   * @param body.includeRecommendations - Whether to include recommendations
   * @returns Object containing generated report details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "vendorId": "vendor-123",
   *   "reportPeriod": "Q1-2024",
   *   "includeComparisons": true,
   *   "includeRecommendations": true
   * }
   * 
   * // Response format
   * {
   *   "reportId": "report-101",
   *   "vendorId": "vendor-123",
   *   "reportPeriod": "Q1-2024",
   *   "overallScore": 4.2,
   *   "performanceTrend": "improving",
   *   "keyInsights": [
   *     "Consistent high-quality delivery",
   *     "Improved communication over time"
   *   ],
   *   "recommendations": [
   *     "Continue current service quality",
   *     "Focus on cost optimization"
   *   ],
   *   "generatedAt": "2024-01-25T17:00:00Z"
   * }
   * ```
   */
  @Post("reports")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  generatePerformanceReport(
    @Param("tenantId") tenantId: string,
    @Body() body: { vendorId: string; reportPeriod: string; includeComparisons: boolean; includeRecommendations: boolean }
  ) {
    return this.service.generatePerformanceReport(tenantId, body.vendorId, body.reportPeriod, body.includeComparisons, body.includeRecommendations);
  }
}
