/**
 * @fileoverview Communications Center Controller
 * 
 * This controller provides unified communications endpoints for the CRM BenchSales AI Integration application.
 * It handles email management, message drafting, and communication tracking capabilities.
 * 
 * Key features:
 * - Unified inbox for emails and messages
 * - AI-powered message drafting
 * - Communication tracking and analytics
 * - Template management
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
import { CommunicationsCenterService } from "./communications-center.service";

/**
 * Controller for unified communications functionality.
 * 
 * This controller provides endpoints for email management, message drafting,
 * and communication tracking with AI-powered assistance.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Get unified inbox
 * GET /tenants/{tenantId}/communications/inbox
 * 
 * // Draft AI message
 * POST /tenants/{tenantId}/communications/draft
 * {
 *   "type": "outreach",
 *   "recipient": "candidate@example.com",
 *   "context": { "requirementId": "req-123" }
 * }
 * ```
 */
@Controller("tenants/:tenantId/communications")
export class CommunicationsCenterController {
  /**
   * Initializes the communications center controller with the service dependency.
   * 
   * @param service - The communications center service for business logic
   */
  constructor(private readonly service: CommunicationsCenterService) {}

  /**
   * Retrieves the unified inbox with emails and messages.
   * 
   * This endpoint provides a consolidated view of all communications
   * including emails, messages, and notifications for the tenant.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering and pagination
   * @param query.type - Type of communications to retrieve
   * @param query.status - Status filter (unread, read, archived)
   * @param query.limit - Maximum number of items to return
   * @param query.offset - Number of items to skip
   * @returns Object containing communications and pagination info
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "communications": [
   *     {
   *       "id": "comm-123",
   *       "type": "EMAIL",
   *       "subject": "Re: Senior Developer Position",
   *       "from": "candidate@example.com",
   *       "to": "recruiter@company.com",
   *       "status": "UNREAD",
   *       "receivedAt": "2024-01-15T10:30:00Z"
   *     }
   *   ],
   *   "pagination": {
   *     "total": 150,
   *     "limit": 20,
   *     "offset": 0
   *   }
   * }
   * ```
   */
  @Get("inbox")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getInbox(
    @Param("tenantId") tenantId: string,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.service.getInbox(tenantId, type, status, limit, offset);
  }

  /**
   * Drafts AI-powered messages for various communication types.
   * 
   * This endpoint generates personalized messages using AI based on
   * the communication type, recipient, and context provided.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing message parameters
   * @param body.type - Type of message (outreach, follow-up, interview, etc.)
   * @param body.recipient - Recipient email or identifier
   * @param body.context - Context information for personalization
   * @returns Object containing drafted message content
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "type": "outreach",
   *   "recipient": "candidate@example.com",
   *   "context": {
   *     "requirementId": "req-123",
   *     "candidateName": "John Doe",
   *     "roleTitle": "Senior React Developer"
   *   }
   * }
   * 
   * // Response format
   * {
   *   "messageId": "msg-456",
   *   "subject": "Senior React Developer Opportunity",
   *   "body": "Hi John,\n\nI hope this message finds you well...",
   *   "suggestions": ["Add specific project details", "Include company benefits"]
   * }
   * ```
   */
  @Post("draft")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  draftMessage(
    @Param("tenantId") tenantId: string,
    @Body() body: { type: string; recipient: string; context: Record<string, any> }
  ) {
    return this.service.draftMessage(tenantId, body.type, body.recipient, body.context);
  }

  /**
   * Sends a message through the appropriate communication channel.
   * 
   * This endpoint handles sending messages via email, SMS, or other
   * communication channels with tracking and delivery confirmation.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing message details
   * @param body.messageId - ID of the drafted message
   * @param body.channel - Communication channel (email, sms, etc.)
   * @param body.scheduledAt - Optional scheduled send time
   * @returns Object containing send confirmation and tracking info
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "messageId": "msg-456",
   *   "channel": "email",
   *   "scheduledAt": "2024-01-15T14:00:00Z"
   * }
   * 
   * // Response format
   * {
   *   "sendId": "send-789",
   *   "status": "SCHEDULED",
   *   "scheduledAt": "2024-01-15T14:00:00Z",
   *   "trackingId": "track-101"
   * }
   * ```
   */
  @Post("send")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  sendMessage(
    @Param("tenantId") tenantId: string,
    @Body() body: { messageId: string; channel: string; scheduledAt?: string }
  ) {
    return this.service.sendMessage(tenantId, body.messageId, body.channel, body.scheduledAt);
  }

  /**
   * Retrieves communication templates for reuse.
   * 
   * This endpoint provides access to saved message templates
   * for common communication scenarios.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering templates
   * @param query.category - Template category filter
   * @param query.search - Search term for template content
   * @returns Array of communication templates
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "id": "template-123",
   *     "name": "Initial Outreach",
   *     "category": "outreach",
   *     "subject": "Exciting Opportunity at {company}",
   *     "body": "Hi {candidateName},\n\nWe have an exciting opportunity...",
   *     "variables": ["company", "candidateName", "roleTitle"]
   *   }
   * ]
   * ```
   */
  @Get("templates")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getTemplates(
    @Param("tenantId") tenantId: string,
    @Query("category") category?: string,
    @Query("search") search?: string
  ) {
    return this.service.getTemplates(tenantId, category, search);
  }

  /**
   * Retrieves communication analytics and metrics.
   * 
   * This endpoint provides insights into communication effectiveness
   * including response rates, engagement metrics, and performance data.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for analytics
   * @param query.period - Time period for analytics (7d, 30d, 90d)
   * @param query.metricType - Type of metrics to retrieve
   * @returns Object containing communication analytics
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "totalSent": 150,
   *     "responseRate": 0.35,
   *     "avgResponseTime": "2.5 hours"
   *   },
   *   "byType": {
   *     "outreach": { "sent": 100, "responses": 40, "rate": 0.40 },
   *     "followup": { "sent": 50, "responses": 15, "rate": 0.30 }
   *   }
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
}
