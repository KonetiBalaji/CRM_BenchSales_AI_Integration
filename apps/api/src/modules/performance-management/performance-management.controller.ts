/**
 * @fileoverview Performance Management Controller
 * 
 * This controller provides performance management endpoints for the CRM BenchSales AI Integration application.
 * It handles performance reviews, goal setting, and feedback management capabilities.
 * 
 * Key features:
 * - Performance review cycles
 * - Goal setting and tracking
 * - 360-degree feedback
 * - Performance analytics
 * - Career development planning
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
import { PerformanceManagementService } from "./performance-management.service";

/**
 * Controller for performance management functionality.
 * 
 * This controller provides endpoints for managing performance reviews,
 * goal setting, and feedback collection with comprehensive
 * analytics and development planning.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Create performance review
 * POST /tenants/{tenantId}/performance/reviews
 * {
 *   "employeeId": "emp-123",
 *   "reviewPeriod": "Q1-2024",
 *   "reviewerId": "mgr-456"
 * }
 * 
 * // Set performance goals
 * POST /tenants/{tenantId}/performance/goals
 * {
 *   "employeeId": "emp-123",
 *   "goals": [{"title": "Increase sales by 20%", "target": "20%"}]
 * }
 * ```
 */
@Controller("tenants/:tenantId/performance")
export class PerformanceManagementController {
  /**
   * Initializes the performance management controller with the service dependency.
   * 
   * @param service - The performance management service for business logic
   */
  constructor(private readonly service: PerformanceManagementService) {}

  /**
   * Creates a new performance review for an employee.
   * 
   * This endpoint initiates a performance review cycle with
   * goal assessment, feedback collection, and rating system.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing review details
   * @param body.employeeId - The employee identifier
   * @param body.reviewPeriod - Review period (e.g., Q1-2024, Annual-2024)
   * @param body.reviewerId - ID of the reviewer/manager
   * @param body.reviewType - Type of review (annual, quarterly, probation)
   * @param body.goals - Performance goals to be reviewed
   * @returns Object containing review details and status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "employeeId": "emp-123",
   *   "reviewPeriod": "Q1-2024",
   *   "reviewerId": "mgr-456",
   *   "reviewType": "quarterly",
   *   "goals": [
   *     {
   *       "goalId": "goal-1",
   *       "title": "Increase client satisfaction",
   *       "target": "90%",
   *       "achieved": "85%"
   *     }
   *   ]
   * }
   * 
   * // Response format
   * {
   *   "reviewId": "review-789",
   *   "employeeId": "emp-123",
   *   "reviewPeriod": "Q1-2024",
   *   "status": "IN_PROGRESS",
   *   "createdAt": "2024-01-15T10:00:00Z",
   *   "dueDate": "2024-01-30T17:00:00Z"
   * }
   * ```
   */
  @Post("reviews")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  createPerformanceReview(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      employeeId: string; 
      reviewPeriod: string; 
      reviewerId: string; 
      reviewType: string; 
      goals: Array<{ goalId: string; title: string; target: string; achieved: string }> 
    }
  ) {
    return this.service.createPerformanceReview(tenantId, body.employeeId, body.reviewPeriod, body.reviewerId, body.reviewType, body.goals);
  }

  /**
   * Retrieves all performance reviews for the tenant.
   * 
   * This endpoint provides a list of all performance reviews with their
   * status, ratings, and completion information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering and pagination
   * @param query.status - Review status filter
   * @param query.reviewPeriod - Filter by review period
   * @param query.employeeId - Filter by employee ID
   * @param query.limit - Maximum number of reviews to return
   * @param query.offset - Number of reviews to skip
   * @returns Array of performance reviews with pagination info
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "reviewId": "review-789",
   *     "employeeName": "John Doe",
   *     "reviewPeriod": "Q1-2024",
   *     "reviewType": "quarterly",
   *     "status": "COMPLETED",
   *     "overallRating": 4.2,
   *     "createdAt": "2024-01-15T10:00:00Z",
   *     "completedAt": "2024-01-25T15:30:00Z"
   *   }
   * ]
   * ```
   */
  @Get("reviews")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getPerformanceReviews(
    @Param("tenantId") tenantId: string,
    @Query("status") status?: string,
    @Query("reviewPeriod") reviewPeriod?: string,
    @Query("employeeId") employeeId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.service.getPerformanceReviews(tenantId, status, reviewPeriod, employeeId, limit, offset);
  }

  /**
   * Retrieves detailed information about a specific performance review.
   * 
   * This endpoint provides comprehensive details about a performance review
   * including goals, ratings, feedback, and development recommendations.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param reviewId - The performance review identifier
   * @returns Object containing detailed performance review information
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "reviewId": "review-789",
   *   "employee": {
   *     "id": "emp-123",
   *     "name": "John Doe",
   *     "position": "Senior Developer",
   *     "department": "Engineering"
   *   },
   *   "reviewer": {
   *     "id": "mgr-456",
   *     "name": "Jane Smith",
   *     "position": "Engineering Manager"
   *   },
   *   "reviewPeriod": "Q1-2024",
   *   "reviewType": "quarterly",
   *   "status": "COMPLETED",
   *   "overallRating": 4.2,
   *   "goals": [
   *     {
   *       "goalId": "goal-1",
   *       "title": "Increase client satisfaction",
   *       "target": "90%",
   *       "achieved": "85%",
   *       "rating": 4.0
   *     }
   *   ],
   *   "feedback": {
   *     "strengths": ["Strong technical skills", "Good team collaboration"],
   *     "areasForImprovement": ["Time management", "Documentation"],
   *     "recommendations": ["Attend time management training"]
   *   },
   *   "developmentPlan": {
   *     "nextGoals": ["Improve documentation skills"],
   *     "trainingNeeded": ["Time management course"],
   *     "careerPath": "Senior Technical Lead"
   *   }
   * }
   * ```
   */
  @Get("reviews/:reviewId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getPerformanceReview(@Param("tenantId") tenantId: string, @Param("reviewId") reviewId: string) {
    return this.service.getPerformanceReview(tenantId, reviewId);
  }

  /**
   * Submits performance review feedback and ratings.
   * 
   * This endpoint allows reviewers to submit detailed feedback,
   * ratings, and development recommendations for employees.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param reviewId - The performance review identifier
   * @param body - Request body containing feedback details
   * @param body.overallRating - Overall performance rating (1-5)
   * @param body.goalRatings - Ratings for individual goals
   * @param body.feedback - Detailed feedback text
   * @param body.strengths - Employee strengths
   * @param body.areasForImprovement - Areas for improvement
   * @param body.recommendations - Development recommendations
   * @returns Object containing feedback submission confirmation
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "overallRating": 4.2,
   *   "goalRatings": [
   *     {
   *       "goalId": "goal-1",
   *       "rating": 4.0,
   *       "comments": "Good progress, room for improvement"
   *     }
   *   ],
   *   "feedback": "John has shown excellent technical skills and team collaboration...",
   *   "strengths": ["Strong technical skills", "Good team collaboration"],
   *   "areasForImprovement": ["Time management", "Documentation"],
   *   "recommendations": ["Attend time management training", "Improve documentation practices"]
   * }
   * 
   * // Response format
   * {
   *   "reviewId": "review-789",
   *   "status": "COMPLETED",
   *   "overallRating": 4.2,
   *   "feedbackSubmittedAt": "2024-01-25T15:30:00Z",
   *   "nextReviewDate": "2024-04-01"
   * }
   * ```
   */
  @Post("reviews/:reviewId/feedback")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  submitPerformanceFeedback(
    @Param("tenantId") tenantId: string,
    @Param("reviewId") reviewId: string,
    @Body() body: { 
      overallRating: number; 
      goalRatings: Array<{ goalId: string; rating: number; comments: string }>; 
      feedback: string; 
      strengths: string[]; 
      areasForImprovement: string[]; 
      recommendations: string[] 
    }
  ) {
    return this.service.submitPerformanceFeedback(tenantId, reviewId, body.overallRating, body.goalRatings, body.feedback, body.strengths, body.areasForImprovement, body.recommendations);
  }

  /**
   * Sets performance goals for an employee.
   * 
   * This endpoint allows setting and tracking performance goals
   * with measurable targets and progress monitoring.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing goal details
   * @param body.employeeId - The employee identifier
   * @param body.goals - Array of performance goals
   * @param body.goalPeriod - Goal period (e.g., Q1-2024, Annual-2024)
   * @param body.setBy - ID of the person setting the goals
   * @returns Object containing goal setting confirmation
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "employeeId": "emp-123",
   *   "goalPeriod": "Q1-2024",
   *   "setBy": "mgr-456",
   *   "goals": [
   *     {
   *       "title": "Increase client satisfaction",
   *       "description": "Improve client satisfaction scores",
   *       "target": "90%",
   *       "measurement": "Client satisfaction survey",
   *       "deadline": "2024-03-31"
   *     }
   *   ]
   * }
   * 
   * // Response format
   * {
   *   "goalSetId": "goalset-789",
   *   "employeeId": "emp-123",
   *   "goalPeriod": "Q1-2024",
   *   "goals": [
   *     {
   *       "goalId": "goal-1",
   *       "title": "Increase client satisfaction",
   *       "target": "90%",
   *       "status": "ACTIVE"
   *     }
   *   ],
   *   "createdAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post("goals")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  setPerformanceGoals(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      employeeId: string; 
      goals: Array<{ title: string; description: string; target: string; measurement: string; deadline: string }>; 
      goalPeriod: string; 
      setBy: string 
    }
  ) {
    return this.service.setPerformanceGoals(tenantId, body.employeeId, body.goals, body.goalPeriod, body.setBy);
  }

  /**
   * Retrieves performance analytics and metrics.
   * 
   * This endpoint provides comprehensive analytics including
   * performance trends, goal achievement rates, and team comparisons.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for analytics
   * @param query.period - Time period for analytics (7d, 30d, 90d, 1y)
   * @param query.department - Filter by department
   * @param query.includeTrends - Whether to include trend analysis
   * @returns Object containing performance analytics and metrics
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "totalReviews": 45,
   *     "avgRating": 4.1,
   *     "goalAchievementRate": 0.78,
   *     "topPerformers": 12
   *   },
   *   "byDepartment": [
   *     {
   *       "department": "Engineering",
   *       "avgRating": 4.3,
   *       "goalAchievementRate": 0.85,
   *       "totalEmployees": 20
   *     }
   *   ],
   *   "trends": [
   *     {
   *       "period": "Q1-2024",
   *       "avgRating": 4.1,
   *       "goalAchievementRate": 0.78
   *     }
   *   ],
   *   "topPerformers": [
   *     {
   *       "employeeId": "emp-123",
   *       "employeeName": "John Doe",
   *       "rating": 4.8,
   *       "goalAchievementRate": 0.95
   *     }
   *   ]
   * }
   * ```
   */
  @Get("analytics")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getPerformanceAnalytics(
    @Param("tenantId") tenantId: string,
    @Query("period") period?: string,
    @Query("department") department?: string,
    @Query("includeTrends") includeTrends?: string
  ) {
    return this.service.getPerformanceAnalytics(tenantId, period, department, includeTrends);
  }

  /**
   * Creates a 360-degree feedback request.
   * 
   * This endpoint initiates a 360-degree feedback process
   * with multiple reviewers and comprehensive feedback collection.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing 360 feedback details
   * @param body.employeeId - The employee identifier
   * @param body.reviewers - Array of reviewer IDs and relationships
   * @param body.feedbackCategories - Categories for feedback collection
   * @param body.deadline - Feedback submission deadline
   * @returns Object containing 360 feedback request details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "employeeId": "emp-123",
   *   "reviewers": [
   *     {
   *       "reviewerId": "mgr-456",
   *       "relationship": "direct_manager"
   *     },
   *     {
   *       "reviewerId": "peer-789",
   *       "relationship": "peer"
   *     }
   *   ],
   *   "feedbackCategories": ["leadership", "communication", "technical_skills"],
   *   "deadline": "2024-02-15T17:00:00Z"
   * }
   * 
   * // Response format
   * {
   *   "feedbackRequestId": "360-request-789",
   *   "employeeId": "emp-123",
   *   "status": "PENDING",
   *   "totalReviewers": 2,
   *   "completedReviews": 0,
   *   "deadline": "2024-02-15T17:00:00Z",
   *   "createdAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post("360-feedback")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  create360Feedback(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      employeeId: string; 
      reviewers: Array<{ reviewerId: string; relationship: string }>; 
      feedbackCategories: string[]; 
      deadline: string 
    }
  ) {
    return this.service.create360Feedback(tenantId, body.employeeId, body.reviewers, body.feedbackCategories, body.deadline);
  }
}
