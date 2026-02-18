/**
 * @fileoverview Email Campaigns Controller
 * 
 * This controller provides email campaign management endpoints for the CRM BenchSales AI Integration application.
 * It handles campaign creation, segmentation, sending, and analytics capabilities.
 * 
 * Key features:
 * - Campaign creation and management
 * - Audience segmentation
 * - Email template management
 * - Send scheduling and automation
 * - Deliverability insights and analytics
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
import { EmailCampaignsService } from "./email-campaigns.service";

/**
 * Controller for email campaign management functionality.
 * 
 * This controller provides endpoints for creating, managing, and analyzing
 * email campaigns with advanced segmentation and automation features.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Create a new campaign
 * POST /tenants/{tenantId}/email-campaigns
 * {
 *   "name": "Q1 Developer Outreach",
 *   "templateId": "template-123",
 *   "segmentCriteria": { "skills": ["React", "Node.js"] }
 * }
 * 
 * // Get campaign analytics
 * GET /tenants/{tenantId}/email-campaigns/{campaignId}/analytics
 * ```
 */
@Controller("tenants/:tenantId/email-campaigns")
export class EmailCampaignsController {
  /**
   * Initializes the email campaigns controller with the service dependency.
   * 
   * @param service - The email campaigns service for business logic
   */
  constructor(private readonly service: EmailCampaignsService) {}

  /**
   * Creates a new email campaign with specified parameters.
   * 
   * This endpoint creates a new email campaign with template, segmentation,
   * and scheduling configuration.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing campaign parameters
   * @param body.name - Campaign name
   * @param body.templateId - Email template ID to use
   * @param body.segmentCriteria - Audience segmentation criteria
   * @param body.scheduledAt - Optional scheduled send time
   * @returns Object containing campaign details and status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "name": "Q1 Developer Outreach",
   *   "templateId": "template-123",
   *   "segmentCriteria": {
   *     "skills": ["React", "Node.js"],
   *     "location": "Remote",
   *     "experience": "3+ years"
   *   },
   *   "scheduledAt": "2024-01-20T09:00:00Z"
   * }
   * 
   * // Response format
   * {
   *   "campaignId": "campaign-456",
   *   "name": "Q1 Developer Outreach",
   *   "status": "SCHEDULED",
   *   "audienceSize": 150,
   *   "scheduledAt": "2024-01-20T09:00:00Z"
   * }
   * ```
   */
  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  createCampaign(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      name: string; 
      templateId: string; 
      segmentCriteria: Record<string, any>; 
      scheduledAt?: string 
    }
  ) {
    return this.service.createCampaign(tenantId, body.name, body.templateId, body.segmentCriteria, body.scheduledAt);
  }

  /**
   * Retrieves all email campaigns for the tenant.
   * 
   * This endpoint provides a list of all email campaigns with their
   * current status, performance metrics, and configuration details.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering and pagination
   * @param query.status - Campaign status filter
   * @param query.limit - Maximum number of campaigns to return
   * @param query.offset - Number of campaigns to skip
   * @returns Array of email campaigns with pagination info
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "campaignId": "campaign-456",
   *     "name": "Q1 Developer Outreach",
   *     "status": "COMPLETED",
   *     "audienceSize": 150,
   *     "sent": 150,
   *     "delivered": 145,
   *     "opened": 89,
   *     "clicked": 23,
   *     "createdAt": "2024-01-15T10:00:00Z"
   *   }
   * ]
   * ```
   */
  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getCampaigns(
    @Param("tenantId") tenantId: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.service.getCampaigns(tenantId, status, limit, offset);
  }

  /**
   * Retrieves detailed information about a specific campaign.
   * 
   * This endpoint provides comprehensive details about a campaign
   * including configuration, performance metrics, and recipient data.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param campaignId - The campaign identifier
   * @returns Object containing detailed campaign information
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "campaignId": "campaign-456",
   *   "name": "Q1 Developer Outreach",
   *   "status": "COMPLETED",
   *   "template": {
   *     "id": "template-123",
   *     "name": "Developer Outreach Template",
   *     "subject": "Exciting Opportunity for {roleTitle}"
   *   },
   *   "segmentCriteria": {
   *     "skills": ["React", "Node.js"],
   *     "location": "Remote"
   *   },
   *   "performance": {
   *     "audienceSize": 150,
   *     "sent": 150,
   *     "delivered": 145,
   *     "opened": 89,
   *     "clicked": 23,
   *     "bounced": 5,
   *     "unsubscribed": 2
   *   }
   * }
   * ```
   */
  @Get(":campaignId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getCampaign(@Param("tenantId") tenantId: string, @Param("campaignId") campaignId: string) {
    return this.service.getCampaign(tenantId, campaignId);
  }

  /**
   * Updates an existing email campaign.
   * 
   * This endpoint allows modification of campaign parameters including
   * template, segmentation, and scheduling configuration.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param campaignId - The campaign identifier
   * @param body - Request body containing updated campaign parameters
   * @returns Object containing updated campaign details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "name": "Updated Q1 Developer Outreach",
   *   "templateId": "template-456",
   *   "scheduledAt": "2024-01-25T09:00:00Z"
   * }
   * ```
   */
  @Put(":campaignId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  updateCampaign(
    @Param("tenantId") tenantId: string,
    @Param("campaignId") campaignId: string,
    @Body() body: { name?: string; templateId?: string; scheduledAt?: string }
  ) {
    return this.service.updateCampaign(tenantId, campaignId, body);
  }

  /**
   * Retrieves comprehensive analytics for a specific campaign.
   * 
   * This endpoint provides detailed performance metrics including
   * delivery rates, engagement statistics, and recipient behavior.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param campaignId - The campaign identifier
   * @param query - Query parameters for analytics
   * @param query.metricType - Type of metrics to retrieve
   * @param query.includeRecipients - Whether to include recipient-level data
   * @returns Object containing campaign analytics and metrics
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "sent": 150,
   *     "delivered": 145,
   *     "deliveryRate": 0.967,
   *     "opened": 89,
   *     "openRate": 0.614,
   *     "clicked": 23,
   *     "clickRate": 0.159
   *   },
   *   "timeline": [
   *     {
   *       "date": "2024-01-15",
   *       "sent": 150,
   *       "opened": 45,
   *       "clicked": 12
   *     }
   *   ],
   *   "recipients": [
   *     {
   *       "email": "candidate@example.com",
   *       "status": "OPENED",
   *       "openedAt": "2024-01-15T10:30:00Z",
   *       "clickedAt": "2024-01-15T10:35:00Z"
   *     }
   *   ]
   * }
   * ```
   */
  @Get(":campaignId/analytics")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getCampaignAnalytics(
    @Param("tenantId") tenantId: string,
    @Param("campaignId") campaignId: string,
    @Query("metricType") metricType?: string,
    @Query("includeRecipients") includeRecipients?: string
  ) {
    return this.service.getCampaignAnalytics(tenantId, campaignId, metricType, includeRecipients);
  }

  /**
   * Sends a test email for campaign validation.
   * 
   * This endpoint sends a test email to specified recipients
   * for campaign validation before full deployment.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param campaignId - The campaign identifier
   * @param body - Request body containing test parameters
   * @param body.testEmails - Array of email addresses for testing
   * @param body.personalizationData - Optional personalization data for testing
   * @returns Object containing test send confirmation
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "testEmails": ["test1@example.com", "test2@example.com"],
   *   "personalizationData": {
   *     "candidateName": "Test User",
   *     "roleTitle": "Senior Developer"
   *   }
   * }
   * 
   * // Response format
   * {
   *   "testId": "test-789",
   *   "status": "SENT",
   *   "recipients": ["test1@example.com", "test2@example.com"],
   *   "sentAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post(":campaignId/test")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  sendTestEmail(
    @Param("tenantId") tenantId: string,
    @Param("campaignId") campaignId: string,
    @Body() body: { testEmails: string[]; personalizationData?: Record<string, any> }
  ) {
    return this.service.sendTestEmail(tenantId, campaignId, body.testEmails, body.personalizationData);
  }
}
