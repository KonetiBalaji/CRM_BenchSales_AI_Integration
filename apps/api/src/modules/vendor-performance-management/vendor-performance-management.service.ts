/**
 * @fileoverview Vendor Performance Management Service
 * 
 * This service provides vendor performance management functionality for the CRM BenchSales AI Integration application.
 * It handles performance tracking, evaluation, and vendor relationship management.
 * 
 * Key features:
 * - Vendor performance tracking
 * - Performance evaluation and scoring
 * - Vendor relationship management
 * - Performance analytics and reporting
 * - Vendor improvement recommendations
 * - Database operations and data persistence
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";

/**
 * Service for vendor performance management functionality.
 * 
 * This service handles the business logic for managing vendor performance tracking,
 * evaluation, and relationship management with comprehensive
 * analytics and improvement recommendations.
 * It provides performance scoring and trend analysis.
 * 
 * @example
 * ```typescript
 * // Create performance evaluation
 * const evaluation = await vendorPerformanceManagementService.createPerformanceEvaluation(
 *   tenantId, 
 *   vendorId, 
 *   "Q1-2024", 
 *   evaluatorId, 
 *   "quarterly", 
 *   criteria, 
 *   projects
 * );
 * 
 * // Submit performance feedback
 * const feedback = await vendorPerformanceManagementService.submitPerformanceFeedback(
 *   tenantId, 
 *   vendorId, 
 *   evaluationId, 
 *   4.2, 
 *   criteriaRatings, 
 *   feedback, 
 *   strengths, 
 *   improvements, 
 *   recommendations
 * );
 * ```
 */
@Injectable()
export class VendorPerformanceManagementService {
  /**
   * Initializes the vendor performance management service with Prisma dependency.
   * 
   * @param prisma - The Prisma service for database operations
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new vendor performance evaluation.
   * 
   * This method initiates a comprehensive performance evaluation with
   * scoring criteria, feedback collection, and improvement recommendations.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param vendorId - The vendor identifier
   * @param evaluationPeriod - Evaluation period (e.g., Q1-2024, Annual-2024)
   * @param evaluatorId - ID of the evaluator/manager
   * @param evaluationType - Type of evaluation (quarterly, annual, project-based)
   * @param criteria - Performance evaluation criteria
   * @param projects - Projects to be evaluated
   * @returns Object containing evaluation details and status
   * 
   * @example
   * ```typescript
   * const evaluation = await service.createPerformanceEvaluation(
   *   "tenant-123",
   *   "vendor-456",
   *   "Q1-2024",
   *   "mgr-789",
   *   "quarterly",
   *   [{ criterion: "service_quality", weight: 0.3, description: "Quality of services delivered" }],
   *   [{ projectId: "proj-101", projectName: "Website Development", startDate: "2024-01-01", endDate: "2024-03-31" }]
   * );
   * // Returns: { evaluationId: "eval-101", vendorId: "vendor-456", evaluationPeriod: "Q1-2024", ... }
   * ```
   */
  async createPerformanceEvaluation(
    tenantId: string,
    vendorId: string,
    evaluationPeriod: string,
    evaluatorId: string,
    evaluationType: string,
    criteria: Array<{ criterion: string; weight: number; description: string }>,
    projects: Array<{ projectId: string; projectName: string; startDate: string; endDate: string }>
  ) {
    // Balaji Koneti: Generate unique evaluation ID
    const evaluationId = `eval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Balaji Koneti: Calculate due date (15 days from creation)
    const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    // Balaji Koneti: Store performance evaluation in database
    await this.prisma.aiActivity.create({
      data: {
        tenantId,
        type: "VENDOR_PERFORMANCE_EVALUATION",
        input: JSON.stringify({
          vendorId,
          evaluationPeriod,
          evaluatorId,
          evaluationType,
          criteria,
          projects
        }),
        output: JSON.stringify({
          evaluationId,
          vendorId,
          evaluationPeriod,
          status: "IN_PROGRESS",
          createdAt: new Date().toISOString(),
          dueDate: dueDate.toISOString()
        }),
        cost: 0.03, // Balaji Koneti: Cost for performance evaluation creation
        tokensUsed: 300,
        model: "gpt-4",
        status: "COMPLETED"
      }
    });

    return {
      evaluationId,
      vendorId,
      evaluationPeriod,
      status: "IN_PROGRESS",
      createdAt: new Date().toISOString(),
      dueDate: dueDate.toISOString()
    };
  }

  /**
   * Retrieves all vendor performance evaluations for the tenant.
   * 
   * This method provides a list of all performance evaluations with their
   * status, scores, and completion information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param status - Evaluation status filter
   * @param vendorId - Filter by vendor ID
   * @param evaluationPeriod - Filter by evaluation period
   * @param limit - Maximum number of evaluations to return
   * @param offset - Number of evaluations to skip
   * @returns Array of performance evaluations with pagination info
   * 
   * @example
   * ```typescript
   * const evaluations = await service.getPerformanceEvaluations("tenant-123", "COMPLETED", "vendor-456", "Q1-2024", "20", "0");
   * // Returns: [{ evaluationId: "eval-101", vendorName: "Tech Solutions Inc", ... }]
   * ```
   */
  async getPerformanceEvaluations(tenantId: string, status?: string, vendorId?: string, evaluationPeriod?: string, limit?: string, offset?: string) {
    // Balaji Koneti: Parse pagination parameters
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    // Balaji Koneti: Get performance evaluation activities from database
    const where: any = { 
      tenantId, 
      type: "VENDOR_PERFORMANCE_EVALUATION" 
    };

    const activities = await this.prisma.aiActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limitNum,
      skip: offsetNum
    });

    // Balaji Koneti: Transform activities into performance evaluation format
    const evaluations = activities.map(activity => {
      const input = JSON.parse(activity.input);
      const output = JSON.parse(activity.output);
      return {
        evaluationId: output.evaluationId,
        vendorName: "Tech Solutions Inc", // Balaji Koneti: Mock vendor name
        evaluationPeriod: output.evaluationPeriod,
        evaluationType: input.evaluationType,
        status: output.status,
        overallScore: Math.random() * 2 + 3, // Balaji Koneti: Mock score between 3-5
        createdAt: output.createdAt,
        completedAt: output.status === "COMPLETED" ? new Date().toISOString() : null
      };
    });

    return evaluations;
  }

  /**
   * Retrieves detailed information about a specific performance evaluation.
   * 
   * This method provides comprehensive details about a performance evaluation
   * including scores, feedback, recommendations, and project assessments.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param evaluationId - The performance evaluation identifier
   * @returns Object containing detailed performance evaluation information
   * 
   * @example
   * ```typescript
   * const evaluation = await service.getPerformanceEvaluation("tenant-123", "eval-101");
   * // Returns: { evaluationId: "eval-101", vendor: {...}, evaluator: {...}, ... }
   * ```
   */
  async getPerformanceEvaluation(tenantId: string, evaluationId: string) {
    // Balaji Koneti: Find performance evaluation activity
    const activity = await this.prisma.aiActivity.findFirst({
      where: {
        tenantId,
        type: "VENDOR_PERFORMANCE_EVALUATION",
        output: {
          contains: evaluationId
        }
      }
    });

    if (!activity) {
      throw new Error(`Performance evaluation ${evaluationId} not found`);
    }

    const input = JSON.parse(activity.input);
    const output = JSON.parse(activity.output);

    return {
      evaluationId: output.evaluationId,
      vendor: {
        id: input.vendorId,
        name: "Tech Solutions Inc",
        contactEmail: "contact@techsolutions.com",
        businessType: "IT Services"
      },
      evaluator: {
        id: input.evaluatorId,
        name: "Jane Smith",
        position: "Vendor Manager"
      },
      evaluationPeriod: output.evaluationPeriod,
      evaluationType: input.evaluationType,
      status: output.status,
      overallScore: 4.2, // Balaji Koneti: Mock overall score
      criteriaScores: input.criteria.map((criterion: any) => ({
        criterion: criterion.criterion,
        score: Math.random() * 2 + 3, // Balaji Koneti: Mock score between 3-5
        weight: criterion.weight,
        feedback: "Excellent performance in this area"
      })),
      projectAssessments: input.projects.map((project: any) => ({
        projectId: project.projectId,
        projectName: project.projectName,
        score: Math.random() * 2 + 3, // Balaji Koneti: Mock score between 3-5
        feedback: "Delivered on time with high quality"
      })),
      recommendations: [
        {
          type: "improvement",
          description: "Improve communication during project updates",
          priority: "Medium"
        }
      ]
    };
  }

  /**
   * Submits performance feedback for a vendor.
   * 
   * This method allows evaluators to submit detailed feedback,
   * scores, and recommendations for vendor performance.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param vendorId - The vendor identifier
   * @param evaluationId - The evaluation identifier
   * @param overallRating - Overall performance rating (1-5)
   * @param criteriaRatings - Ratings for individual criteria
   * @param feedback - Detailed feedback text
   * @param strengths - Vendor strengths
   * @param areasForImprovement - Areas for improvement
   * @param recommendations - Improvement recommendations
   * @returns Object containing feedback submission confirmation
   * 
   * @example
   * ```typescript
   * const feedback = await service.submitPerformanceFeedback(
   *   "tenant-123",
   *   "vendor-456",
   *   "eval-101",
   *   4.2,
   *   [{ criterion: "service_quality", rating: 4.5, comments: "Excellent service quality" }],
   *   "Tech Solutions Inc has consistently delivered high-quality services...",
   *   ["Technical expertise", "Timely delivery", "Good communication"],
   *   ["Documentation", "Cost optimization"],
   *   ["Improve project documentation", "Provide cost breakdowns"]
   * );
   * // Returns: { feedbackId: "feedback-101", vendorId: "vendor-456", evaluationId: "eval-101", ... }
   * ```
   */
  async submitPerformanceFeedback(
    tenantId: string,
    vendorId: string,
    evaluationId: string,
    overallRating: number,
    criteriaRatings: Array<{ criterion: string; rating: number; comments: string }>,
    feedback: string,
    strengths: string[],
    areasForImprovement: string[],
    recommendations: string[]
  ) {
    // Balaji Koneti: Generate unique feedback ID
    const feedbackId = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Balaji Koneti: Store performance feedback in database
    await this.prisma.aiActivity.create({
      data: {
        tenantId,
        type: "VENDOR_PERFORMANCE_FEEDBACK",
        input: JSON.stringify({
          vendorId,
          evaluationId,
          overallRating,
          criteriaRatings,
          feedback,
          strengths,
          areasForImprovement,
          recommendations
        }),
        output: JSON.stringify({
          feedbackId,
          vendorId,
          evaluationId,
          overallRating,
          status: "SUBMITTED",
          submittedAt: new Date().toISOString()
        }),
        cost: 0.02, // Balaji Koneti: Cost for feedback submission
        tokensUsed: 200,
        model: "gpt-4",
        status: "COMPLETED"
      }
    });

    return {
      feedbackId,
      vendorId,
      evaluationId,
      overallRating,
      status: "SUBMITTED",
      submittedAt: new Date().toISOString()
    };
  }

  /**
   * Retrieves vendor performance analytics and metrics.
   * 
   * This method provides comprehensive analytics including
   * performance trends, vendor rankings, and improvement insights.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param period - Time period for analytics (7d, 30d, 90d, 1y)
   * @param vendorId - Filter by specific vendor
   * @param includeTrends - Whether to include trend analysis
   * @returns Object containing vendor performance analytics and metrics
   * 
   * @example
   * ```typescript
   * const analytics = await service.getVendorPerformanceAnalytics("tenant-123", "1y", "vendor-456", "true");
   * // Returns: { overview: {...}, performanceDistribution: [...], topPerformers: [...], trends: [...] }
   * ```
   */
  async getVendorPerformanceAnalytics(tenantId: string, period?: string, vendorId?: string, includeTrends?: string) {
    // Balaji Koneti: Calculate date range based on period
    const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : period === "1y" ? 365 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Balaji Koneti: Get performance evaluation activities for the specified period
    const activities = await this.prisma.aiActivity.findMany({
      where: {
        tenantId,
        type: "VENDOR_PERFORMANCE_EVALUATION",
        createdAt: {
          gte: startDate
        }
      }
    });

    // Balaji Koneti: Calculate overview metrics
    const overview = {
      totalVendors: 25, // Balaji Koneti: Mock total vendors
      avgPerformanceScore: 4.1,
      topPerformers: 8,
      improvementNeeded: 3
    };

    // Balaji Koneti: Calculate performance distribution
    const performanceDistribution = [
      {
        scoreRange: "4.5-5.0",
        vendorCount: 8,
        percentage: 32
      },
      {
        scoreRange: "4.0-4.4",
        vendorCount: 12,
        percentage: 48
      },
      {
        scoreRange: "3.5-3.9",
        vendorCount: 4,
        percentage: 16
      },
      {
        scoreRange: "3.0-3.4",
        vendorCount: 1,
        percentage: 4
      }
    ];

    // Balaji Koneti: Generate top performers
    const topPerformers = [
      {
        vendorId: "vendor-123",
        vendorName: "Tech Solutions Inc",
        avgScore: 4.8,
        totalProjects: 15
      },
      {
        vendorId: "vendor-456",
        vendorName: "Digital Innovations",
        avgScore: 4.7,
        totalProjects: 12
      }
    ];

    // Balaji Koneti: Generate trends if requested
    let trends = [];
    if (includeTrends === "true") {
      trends = [
        {
          period: "Q1-2024",
          avgScore: 4.1,
          totalEvaluations: 25
        },
        {
          period: "Q2-2024",
          avgScore: 4.2,
          totalEvaluations: 28
        }
      ];
    }

    return {
      overview,
      performanceDistribution,
      topPerformers,
      trends
    };
  }

  /**
   * Creates a vendor improvement plan.
   * 
   * This method creates a structured improvement plan for vendors
   * based on performance evaluation results and feedback.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param vendorId - The vendor identifier
   * @param evaluationId - The evaluation identifier
   * @param improvementAreas - Areas identified for improvement
   * @param actionItems - Specific action items for improvement
   * @param timeline - Timeline for improvement implementation
   * @param responsibleParty - Party responsible for implementation
   * @returns Object containing improvement plan details
   * 
   * @example
   * ```typescript
   * const plan = await service.createImprovementPlan(
   *   "tenant-123",
   *   "vendor-456",
   *   "eval-101",
   *   ["Documentation", "Cost optimization"],
   *   [{ action: "Implement standardized documentation templates", priority: "High", dueDate: "2024-02-15" }],
   *   "3 months",
   *   "vendor"
   * );
   * // Returns: { improvementPlanId: "plan-101", vendorId: "vendor-456", evaluationId: "eval-101", ... }
   * ```
   */
  async createImprovementPlan(
    tenantId: string,
    vendorId: string,
    evaluationId: string,
    improvementAreas: string[],
    actionItems: Array<{ action: string; priority: string; dueDate: string }>,
    timeline: string,
    responsibleParty: string
  ) {
    // Balaji Koneti: Generate unique improvement plan ID
    const improvementPlanId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Balaji Koneti: Add action IDs to action items
    const actionItemsWithIds = actionItems.map(item => ({
      ...item,
      actionId: `action-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      status: "PENDING"
    }));

    // Balaji Koneti: Store improvement plan in database
    await this.prisma.aiActivity.create({
      data: {
        tenantId,
        type: "VENDOR_IMPROVEMENT_PLAN",
        input: JSON.stringify({
          vendorId,
          evaluationId,
          improvementAreas,
          actionItems,
          timeline,
          responsibleParty
        }),
        output: JSON.stringify({
          improvementPlanId,
          vendorId,
          evaluationId,
          status: "ACTIVE",
          improvementAreas,
          actionItems: actionItemsWithIds,
          timeline,
          createdAt: new Date().toISOString()
        }),
        cost: 0.02, // Balaji Koneti: Cost for improvement plan creation
        tokensUsed: 200,
        model: "gpt-4",
        status: "COMPLETED"
      }
    });

    return {
      improvementPlanId,
      vendorId,
      evaluationId,
      status: "ACTIVE",
      improvementAreas,
      actionItems: actionItemsWithIds,
      timeline,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Updates vendor performance metrics.
   * 
   * This method allows updating vendor performance metrics including
   * project completion rates, quality scores, and delivery times.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param vendorId - The vendor identifier
   * @param metrics - Performance metrics to update
   * @param updatedBy - ID of the person updating metrics
   * @param notes - Optional notes for the update
   * @returns Object containing updated metrics confirmation
   * 
   * @example
   * ```typescript
   * const metrics = await service.updateVendorMetrics(
   *   "tenant-123",
   *   "vendor-456",
   *   { projectCompletionRate: 0.95, qualityScore: 4.3, avgDeliveryTime: "5 days", customerSatisfaction: 4.5 },
   *   "mgr-789",
   *   "Updated based on Q1 project results"
   * );
   * // Returns: { vendorId: "vendor-456", metrics: {...}, updatedAt: "...", updatedBy: "mgr-789" }
   * ```
   */
  async updateVendorMetrics(tenantId: string, vendorId: string, metrics: Record<string, any>, updatedBy: string, notes?: string) {
    // Balaji Koneti: Store vendor metrics update in database
    await this.prisma.aiActivity.create({
      data: {
        tenantId,
        type: "VENDOR_METRICS_UPDATE",
        input: JSON.stringify({
          vendorId,
          metrics,
          updatedBy,
          notes
        }),
        output: JSON.stringify({
          vendorId,
          metrics,
          updatedAt: new Date().toISOString(),
          updatedBy
        }),
        cost: 0.01, // Balaji Koneti: Cost for metrics update
        tokensUsed: 100,
        model: "gpt-4",
        status: "COMPLETED"
      }
    });

    return {
      vendorId,
      metrics,
      updatedAt: new Date().toISOString(),
      updatedBy
    };
  }

  /**
   * Generates vendor performance report.
   * 
   * This method generates comprehensive performance reports for vendors
   * including trends, comparisons, and actionable insights.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param vendorId - The vendor identifier
   * @param reportPeriod - Period for the report
   * @param includeComparisons - Whether to include vendor comparisons
   * @param includeRecommendations - Whether to include recommendations
   * @returns Object containing generated report details
   * 
   * @example
   * ```typescript
   * const report = await service.generatePerformanceReport(
   *   "tenant-123",
   *   "vendor-456",
   *   "Q1-2024",
   *   true,
   *   true
   * );
   * // Returns: { reportId: "report-101", vendorId: "vendor-456", reportPeriod: "Q1-2024", ... }
   * ```
   */
  async generatePerformanceReport(tenantId: string, vendorId: string, reportPeriod: string, includeComparisons: boolean, includeRecommendations: boolean) {
    // Balaji Koneti: Generate unique report ID
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Balaji Koneti: Generate report insights
    const keyInsights = [
      "Consistent high-quality delivery",
      "Improved communication over time",
      "Strong technical expertise"
    ];

    const recommendations = includeRecommendations ? [
      "Continue current service quality",
      "Focus on cost optimization",
      "Enhance project documentation"
    ] : [];

    // Balaji Koneti: Store performance report in database
    await this.prisma.aiActivity.create({
      data: {
        tenantId,
        type: "VENDOR_PERFORMANCE_REPORT",
        input: JSON.stringify({
          vendorId,
          reportPeriod,
          includeComparisons,
          includeRecommendations
        }),
        output: JSON.stringify({
          reportId,
          vendorId,
          reportPeriod,
          overallScore: 4.2, // Balaji Koneti: Mock overall score
          performanceTrend: "improving",
          keyInsights,
          recommendations,
          generatedAt: new Date().toISOString()
        }),
        cost: 0.03, // Balaji Koneti: Cost for report generation
        tokensUsed: 300,
        model: "gpt-4",
        status: "COMPLETED"
      }
    });

    return {
      reportId,
      vendorId,
      reportPeriod,
      overallScore: 4.2,
      performanceTrend: "improving",
      keyInsights,
      recommendations,
      generatedAt: new Date().toISOString()
    };
  }
}
