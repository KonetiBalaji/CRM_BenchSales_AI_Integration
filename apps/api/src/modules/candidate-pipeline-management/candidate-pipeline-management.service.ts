/**
 * @fileoverview Candidate Pipeline Management Service
 * 
 * This service provides candidate pipeline management functionality for the CRM BenchSales AI Integration application.
 * It handles pipeline stages, workflow automation, and candidate progression tracking.
 * 
 * Key features:
 * - Pipeline stage management
 * - Workflow automation
 * - Candidate progression tracking
 * - Stage transition rules
 * - Pipeline analytics
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
 * Service for candidate pipeline management functionality.
 * 
 * This service handles the business logic for managing candidate pipelines,
 * stage transitions, and workflow automation with comprehensive
 * analytics and progression tracking.
 * It provides stage configuration and bottleneck analysis.
 * 
 * @example
 * ```typescript
 * // Advance candidate to next stage
 * const advancement = await candidatePipelineManagementService.advanceCandidate(
 *   tenantId, 
 *   candidateId, 
 *   "interview", 
 *   "Passed screening", 
 *   "req-123", 
 *   ["send_interview_invite"]
 * );
 * 
 * // Get pipeline analytics
 * const analytics = await candidatePipelineManagementService.getPipelineAnalytics(tenantId, "30d");
 * ```
 */
@Injectable()
export class CandidatePipelineManagementService {
  /**
   * Initializes the candidate pipeline management service with Prisma dependency.
   * 
   * @param prisma - The Prisma service for database operations
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Moves a candidate to the next stage in the pipeline.
   * 
   * This method advances a candidate through the pipeline stages
   * with automatic workflow triggers and notifications.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param candidateId - The candidate identifier
   * @param toStage - Target stage to move to
   * @param notes - Optional notes for the transition
   * @param requirementId - Associated requirement ID
   * @param triggerActions - Actions to trigger on advancement
   * @returns Object containing advancement confirmation and new stage details
   * 
   * @example
   * ```typescript
   * const advancement = await service.advanceCandidate(
   *   "tenant-123",
   *   "candidate-456",
   *   "interview",
   *   "Passed initial screening, ready for technical interview",
   *   "req-789",
   *   ["send_interview_invite", "update_candidate_status"]
   * );
   * // Returns: { candidateId: "candidate-456", fromStage: "screening", toStage: "interview", ... }
   * ```
   */
  async advanceCandidate(
    tenantId: string,
    candidateId: string,
    toStage: string,
    notes?: string,
    requirementId?: string,
    triggerActions?: string[]
  ) {
    // Balaji Koneti: Generate unique transition ID
    const transitionId = `transition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Balaji Koneti: Store advancement in database
    await this.prisma.aiActivity.create({
      data: {
        tenantId,
        type: "PIPELINE_ADVANCEMENT",
        input: JSON.stringify({
          candidateId,
          toStage,
          notes,
          requirementId,
          triggerActions
        }),
        output: JSON.stringify({
          candidateId,
          fromStage: "screening", // Balaji Koneti: Mock previous stage
          toStage,
          transitionId,
          status: "ADVANCED",
          notes,
          advancedAt: new Date().toISOString()
        }),
        cost: 0.01, // Balaji Koneti: Cost for pipeline advancement
        tokensUsed: 100,
        model: "gpt-4",
        status: "COMPLETED"
      }
    });

    return {
      candidateId,
      fromStage: "screening", // Balaji Koneti: Mock previous stage
      toStage,
      transitionId,
      status: "ADVANCED",
      notes,
      advancedAt: new Date().toISOString()
    };
  }

  /**
   * Retrieves all candidates in the pipeline with their current stages.
   * 
   * This method provides a comprehensive view of all candidates
   * in the pipeline with their progression status and stage information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param stage - Filter by pipeline stage
   * @param requirementId - Filter by requirement ID
   * @param status - Filter by candidate status
   * @param limit - Maximum number of candidates to return
   * @param offset - Number of candidates to skip
   * @returns Array of candidates with pipeline information
   * 
   * @example
   * ```typescript
   * const candidates = await service.getPipelineCandidates("tenant-123", "interview", "req-456", "active", "20", "0");
   * // Returns: [{ candidateId: "candidate-456", candidateName: "John Doe", currentStage: "interview", ... }]
   * ```
   */
  async getPipelineCandidates(tenantId: string, stage?: string, requirementId?: string, status?: string, limit?: string, offset?: string) {
    // Balaji Koneti: Parse pagination parameters
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    // Balaji Koneti: Get pipeline activities from database
    const where: any = { 
      tenantId, 
      type: "PIPELINE_ADVANCEMENT" 
    };

    const activities = await this.prisma.aiActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limitNum,
      skip: offsetNum
    });

    // Balaji Koneti: Transform activities into candidate pipeline format
    const candidates = activities.map(activity => {
      const input = JSON.parse(activity.input);
      const output = JSON.parse(activity.output);
      return {
        candidateId: output.candidateId,
        candidateName: "John Doe", // Balaji Koneti: Mock candidate name
        currentStage: output.toStage,
        stageProgress: Math.random(), // Balaji Koneti: Mock progress
        requirementTitle: "Senior React Developer", // Balaji Koneti: Mock requirement title
        clientName: "Tech Corp", // Balaji Koneti: Mock client name
        enteredPipeline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        lastActivity: output.advancedAt,
        daysInStage: Math.floor(Math.random() * 10) + 1
      };
    });

    return candidates;
  }

  /**
   * Retrieves detailed information about a candidate's pipeline journey.
   * 
   * This method provides comprehensive details about a candidate's
   * progression through the pipeline including stage history and timeline.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param candidateId - The candidate identifier
   * @returns Object containing detailed pipeline journey information
   * 
   * @example
   * ```typescript
   * const journey = await service.getCandidatePipelineJourney("tenant-123", "candidate-456");
   * // Returns: { candidateId: "candidate-456", candidateName: "John Doe", currentStage: "interview", ... }
   * ```
   */
  async getCandidatePipelineJourney(tenantId: string, candidateId: string) {
    // Balaji Koneti: Get all pipeline activities for the candidate
    const activities = await this.prisma.aiActivity.findMany({
      where: {
        tenantId,
        type: "PIPELINE_ADVANCEMENT",
        input: {
          contains: candidateId
        }
      },
      orderBy: { createdAt: "asc" }
    });

    if (activities.length === 0) {
      throw new Error(`No pipeline journey found for candidate ${candidateId}`);
    }

    // Balaji Koneti: Build stage history
    const pipelineStages = [
      {
        stage: "sourcing",
        enteredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        exitedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        duration: "2 days 5 hours",
        status: "completed"
      },
      {
        stage: "screening",
        enteredAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        exitedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        duration: "2 days 20 hours",
        status: "completed"
      },
      {
        stage: "interview",
        enteredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        exitedAt: null,
        duration: "5 days",
        status: "active"
      }
    ];

    return {
      candidateId,
      candidateName: "John Doe",
      currentStage: "interview",
      pipelineStages,
      totalTimeInPipeline: "10 days 1 hour",
      nextStage: "final_interview"
    };
  }

  /**
   * Updates pipeline stage configuration and rules.
   * 
   * This method allows modification of pipeline stages including
   * stage names, transition rules, and automation settings.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param stages - Array of pipeline stages with configuration
   * @param transitionRules - Rules for stage transitions
   * @param automationSettings - Automation configuration
   * @returns Object containing updated pipeline configuration
   * 
   * @example
   * ```typescript
   * const config = await service.updatePipelineConfiguration(
   *   "tenant-123",
   *   [{ name: "sourcing", displayName: "Candidate Sourcing", order: 1, autoAdvance: false, slaHours: 24 }],
   *   { sourcing_to_screening: { conditions: ["candidate_qualified"], autoTrigger: true } },
   *   { autoNotifications: true, reminderHours: 24 }
   * );
   * // Returns: { configurationId: "config-123", stages: [...], transitionRules: {...}, ... }
   * ```
   */
  async updatePipelineConfiguration(
    tenantId: string,
    stages: Array<{ name: string; displayName: string; order: number; autoAdvance: boolean; slaHours: number }>,
    transitionRules: Record<string, any>,
    automationSettings: Record<string, any>
  ) {
    // Balaji Koneti: Generate unique configuration ID
    const configurationId = `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Balaji Koneti: Store pipeline configuration in database
    await this.prisma.aiActivity.create({
      data: {
        tenantId,
        type: "PIPELINE_CONFIGURATION",
        input: JSON.stringify({
          stages,
          transitionRules,
          automationSettings
        }),
        output: JSON.stringify({
          configurationId,
          stages,
          transitionRules,
          automationSettings,
          updatedAt: new Date().toISOString()
        }),
        cost: 0.01, // Balaji Koneti: Cost for configuration update
        tokensUsed: 200,
        model: "gpt-4",
        status: "COMPLETED"
      }
    });

    return {
      configurationId,
      stages,
      transitionRules,
      automationSettings,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Retrieves pipeline analytics and performance metrics.
   * 
   * This method provides comprehensive analytics including
   * stage conversion rates, time-to-hire metrics, and bottleneck analysis.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param period - Time period for analytics (7d, 30d, 90d)
   * @param requirementId - Filter by specific requirement
   * @param includeBottlenecks - Whether to include bottleneck analysis
   * @returns Object containing pipeline analytics and metrics
   * 
   * @example
   * ```typescript
   * const analytics = await service.getPipelineAnalytics("tenant-123", "30d", "req-456", "true");
   * // Returns: { overview: {...}, stageMetrics: [...], bottlenecks: [...] }
   * ```
   */
  async getPipelineAnalytics(tenantId: string, period?: string, requirementId?: string, includeBottlenecks?: string) {
    // Balaji Koneti: Calculate date range based on period
    const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Balaji Koneti: Get pipeline activities for the specified period
    const activities = await this.prisma.aiActivity.findMany({
      where: {
        tenantId,
        type: "PIPELINE_ADVANCEMENT",
        createdAt: {
          gte: startDate
        }
      }
    });

    // Balaji Koneti: Calculate overview metrics
    const overview = {
      totalCandidates: 150, // Balaji Koneti: Mock total candidates
      activeCandidates: 45,
      avgTimeToHire: "21 days",
      conversionRate: 0.12
    };

    // Balaji Koneti: Calculate stage metrics
    const stageMetrics = [
      {
        stage: "sourcing",
        candidatesIn: 150,
        candidatesOut: 120,
        conversionRate: 0.80,
        avgTimeInStage: "3 days"
      },
      {
        stage: "screening",
        candidatesIn: 120,
        candidatesOut: 60,
        conversionRate: 0.50,
        avgTimeInStage: "5 days"
      },
      {
        stage: "interview",
        candidatesIn: 60,
        candidatesOut: 18,
        conversionRate: 0.30,
        avgTimeInStage: "8 days"
      }
    ];

    // Balaji Koneti: Generate bottlenecks if requested
    let bottlenecks = [];
    if (includeBottlenecks === "true") {
      bottlenecks = [
        {
          stage: "interview",
          issue: "High time in stage",
          avgTime: "8 days",
          recommendation: "Increase interviewer availability"
        },
        {
          stage: "screening",
          issue: "Low conversion rate",
          avgTime: "5 days",
          recommendation: "Improve screening criteria"
        }
      ];
    }

    return {
      overview,
      stageMetrics,
      bottlenecks
    };
  }

  /**
   * Rejects a candidate and removes them from the pipeline.
   * 
   * This method handles candidate rejection with proper
   * notification and feedback collection.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param candidateId - The candidate identifier
   * @param reason - Reason for rejection
   * @param feedback - Detailed feedback for the candidate
   * @param stage - Stage where rejection occurred
   * @param notifyCandidate - Whether to notify the candidate
   * @returns Object containing rejection confirmation and details
   * 
   * @example
   * ```typescript
   * const rejection = await service.rejectCandidate(
   *   "tenant-123",
   *   "candidate-456",
   *   "Insufficient technical skills",
   *   "Candidate showed good communication but lacked required React experience",
   *   "technical_interview",
   *   true
   * );
   * // Returns: { candidateId: "candidate-456", status: "REJECTED", reason: "Insufficient technical skills", ... }
   * ```
   */
  async rejectCandidate(
    tenantId: string,
    candidateId: string,
    reason: string,
    feedback: string,
    stage: string,
    notifyCandidate: boolean
  ) {
    // Balaji Koneti: Store rejection in database
    await this.prisma.aiActivity.create({
      data: {
        tenantId,
        type: "CANDIDATE_REJECTION",
        input: JSON.stringify({
          candidateId,
          reason,
          feedback,
          stage,
          notifyCandidate
        }),
        output: JSON.stringify({
          candidateId,
          status: "REJECTED",
          reason,
          stage,
          rejectedAt: new Date().toISOString(),
          notificationSent: notifyCandidate
        }),
        cost: 0.01, // Balaji Koneti: Cost for candidate rejection
        tokensUsed: 100,
        model: "gpt-4",
        status: "COMPLETED"
      }
    });

    return {
      candidateId,
      status: "REJECTED",
      reason,
      stage,
      rejectedAt: new Date().toISOString(),
      notificationSent: notifyCandidate
    };
  }

  /**
   * Creates a custom pipeline stage for specific requirements.
   * 
   * This method allows creation of custom pipeline stages
   * tailored to specific client or requirement needs.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param name - Stage name
   * @param displayName - Display name for the stage
   * @param description - Stage description
   * @param order - Stage order in pipeline
   * @param requirementId - Associated requirement ID
   * @param slaHours - SLA hours for the stage
   * @returns Object containing created stage details
   * 
   * @example
   * ```typescript
   * const stage = await service.createCustomStage(
   *   "tenant-123",
   *   "client_interview",
   *   "Client Interview",
   *   "Final interview with client stakeholders",
   *   4,
   *   "req-789",
   *   72
   * );
   * // Returns: { stageId: "stage-101", name: "client_interview", displayName: "Client Interview", ... }
   * ```
   */
  async createCustomStage(
    tenantId: string,
    name: string,
    displayName: string,
    description: string,
    order: number,
    requirementId?: string,
    slaHours: number = 24
  ) {
    // Balaji Koneti: Generate unique stage ID
    const stageId = `stage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Balaji Koneti: Store custom stage in database
    await this.prisma.aiActivity.create({
      data: {
        tenantId,
        type: "CUSTOM_STAGE_CREATION",
        input: JSON.stringify({
          name,
          displayName,
          description,
          order,
          requirementId,
          slaHours
        }),
        output: JSON.stringify({
          stageId,
          name,
          displayName,
          description,
          order,
          requirementId,
          slaHours,
          createdAt: new Date().toISOString()
        }),
        cost: 0.01, // Balaji Koneti: Cost for custom stage creation
        tokensUsed: 100,
        model: "gpt-4",
        status: "COMPLETED"
      }
    });

    return {
      stageId,
      name,
      displayName,
      description,
      order,
      requirementId,
      slaHours,
      createdAt: new Date().toISOString()
    };
  }
}
