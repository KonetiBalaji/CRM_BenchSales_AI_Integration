/**
 * @fileoverview Interview Scheduling Controller
 * 
 * This controller provides interview scheduling endpoints for the CRM BenchSales AI Integration application.
 * It handles calendar integration, automated scheduling, and interview management capabilities.
 * 
 * Key features:
 * - Calendar integration and availability management
 * - Automated interview scheduling
 * - Interview type management
 * - Reminder and notification system
 * - Interview feedback collection
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
import { InterviewSchedulingService } from "./interview-scheduling.service";

/**
 * Controller for interview scheduling functionality.
 * 
 * This controller provides endpoints for managing interview schedules,
 * calendar integration, and automated scheduling with comprehensive
 * notification and feedback systems.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Schedule a new interview
 * POST /tenants/{tenantId}/interviews
 * {
 *   "candidateId": "candidate-123",
 *   "requirementId": "req-456",
 *   "interviewType": "technical",
 *   "scheduledAt": "2024-01-20T14:00:00Z"
 * }
 * 
 * // Get interview calendar
 * GET /tenants/{tenantId}/interviews/calendar?date=2024-01-20
 * ```
 */
@Controller("tenants/:tenantId/interviews")
export class InterviewSchedulingController {
  /**
   * Initializes the interview scheduling controller with the service dependency.
   * 
   * @param service - The interview scheduling service for business logic
   */
  constructor(private readonly service: InterviewSchedulingService) {}

  /**
   * Schedules a new interview with specified details.
   * 
   * This endpoint creates a new interview schedule with calendar integration,
   * automated notifications, and participant management.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing interview details
   * @param body.candidateId - The candidate ID for the interview
   * @param body.requirementId - The requirement ID being interviewed for
   * @param body.interviewType - Type of interview (technical, behavioral, final)
   * @param body.scheduledAt - Scheduled date and time
   * @param body.duration - Interview duration in minutes
   * @param body.interviewers - Array of interviewer IDs
   * @param body.location - Interview location or video link
   * @param body.notes - Additional interview notes
   * @returns Object containing interview details and status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "candidateId": "candidate-123",
   *   "requirementId": "req-456",
   *   "interviewType": "technical",
   *   "scheduledAt": "2024-01-20T14:00:00Z",
   *   "duration": 60,
   *   "interviewers": ["interviewer-1", "interviewer-2"],
   *   "location": "https://zoom.us/j/123456789",
   *   "notes": "Focus on React and Node.js skills"
   * }
   * 
   * // Response format
   * {
   *   "interviewId": "interview-789",
   *   "candidateId": "candidate-123",
   *   "requirementId": "req-456",
   *   "interviewType": "technical",
   *   "scheduledAt": "2024-01-20T14:00:00Z",
   *   "duration": 60,
   *   "status": "SCHEDULED",
   *   "calendarEventId": "cal-event-456"
   * }
   * ```
   */
  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  scheduleInterview(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      candidateId: string; 
      requirementId: string; 
      interviewType: string; 
      scheduledAt: string; 
      duration: number; 
      interviewers: string[]; 
      location: string; 
      notes?: string 
    }
  ) {
    return this.service.scheduleInterview(tenantId, body.candidateId, body.requirementId, body.interviewType, body.scheduledAt, body.duration, body.interviewers, body.location, body.notes);
  }

  /**
   * Retrieves all interviews for the tenant.
   * 
   * This endpoint provides a list of all interviews with their
   * status, participants, and scheduling information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering and pagination
   * @param query.status - Interview status filter
   * @param query.interviewType - Interview type filter
   * @param query.candidateId - Filter by candidate ID
   * @param query.dateFrom - Start date filter
   * @param query.dateTo - End date filter
   * @param query.limit - Maximum number of interviews to return
   * @param query.offset - Number of interviews to skip
   * @returns Array of interviews with pagination info
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "interviewId": "interview-789",
   *     "candidateName": "John Doe",
   *     "requirementTitle": "Senior React Developer",
   *     "interviewType": "technical",
   *     "scheduledAt": "2024-01-20T14:00:00Z",
   *     "duration": 60,
   *     "status": "SCHEDULED",
   *     "interviewers": ["Jane Smith", "Bob Johnson"]
   *   }
   * ]
   * ```
   */
  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getInterviews(
    @Param("tenantId") tenantId: string,
    @Query("status") status?: string,
    @Query("interviewType") interviewType?: string,
    @Query("candidateId") candidateId?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.service.getInterviews(tenantId, status, interviewType, candidateId, dateFrom, dateTo, limit, offset);
  }

  /**
   * Retrieves detailed information about a specific interview.
   * 
   * This endpoint provides comprehensive details about an interview
   * including participants, feedback, and scheduling information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param interviewId - The interview identifier
   * @returns Object containing detailed interview information
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "interviewId": "interview-789",
   *   "candidate": {
   *     "id": "candidate-123",
   *     "name": "John Doe",
   *     "email": "john.doe@example.com",
   *     "phone": "+1-555-0123"
   *   },
   *   "requirement": {
   *     "id": "req-456",
   *     "title": "Senior React Developer",
   *     "clientName": "Tech Corp"
   *   },
   *   "interviewType": "technical",
   *   "scheduledAt": "2024-01-20T14:00:00Z",
   *   "duration": 60,
   *   "status": "SCHEDULED",
   *   "location": "https://zoom.us/j/123456789",
   *   "interviewers": [
   *     {
   *       "id": "interviewer-1",
   *       "name": "Jane Smith",
   *       "role": "Technical Lead"
   *     }
   *   ],
   *   "notes": "Focus on React and Node.js skills",
   *   "feedback": null
   * }
   * ```
   */
  @Get(":interviewId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getInterview(@Param("tenantId") tenantId: string, @Param("interviewId") interviewId: string) {
    return this.service.getInterview(tenantId, interviewId);
  }

  /**
   * Updates an existing interview.
   * 
   * This endpoint allows modification of interview details including
   * scheduling, participants, and location information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param interviewId - The interview identifier
   * @param body - Request body containing updated interview data
   * @returns Object containing updated interview details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "scheduledAt": "2024-01-21T15:00:00Z",
   *   "duration": 90,
   *   "location": "https://zoom.us/j/987654321",
   *   "notes": "Updated focus on system design"
   * }
   * ```
   */
  @Put(":interviewId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  updateInterview(
    @Param("tenantId") tenantId: string,
    @Param("interviewId") interviewId: string,
    @Body() body: { scheduledAt?: string; duration?: number; location?: string; notes?: string; interviewers?: string[] }
  ) {
    return this.service.updateInterview(tenantId, interviewId, body);
  }

  /**
   * Retrieves interview calendar view for a specific date range.
   * 
   * This endpoint provides a calendar view of interviews with
   * availability information and scheduling conflicts.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for calendar view
   * @param query.date - Specific date to view (YYYY-MM-DD)
   * @param query.week - Week view (YYYY-WW format)
   * @param query.month - Month view (YYYY-MM format)
   * @param query.interviewerId - Filter by specific interviewer
   * @returns Object containing calendar data and availability
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "date": "2024-01-20",
   *   "interviews": [
   *     {
   *       "interviewId": "interview-789",
   *       "candidateName": "John Doe",
   *       "interviewType": "technical",
   *       "scheduledAt": "2024-01-20T14:00:00Z",
   *       "duration": 60,
   *       "status": "SCHEDULED"
   *     }
   *   ],
   *   "availability": {
   *     "availableSlots": [
   *       {
   *         "start": "2024-01-20T09:00:00Z",
   *         "end": "2024-01-20T10:00:00Z"
   *       }
   *     ],
   *     "conflicts": []
   *   }
   * }
   * ```
   */
  @Get("calendar")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getInterviewCalendar(
    @Param("tenantId") tenantId: string,
    @Query("date") date?: string,
    @Query("week") week?: string,
    @Query("month") month?: string,
    @Query("interviewerId") interviewerId?: string
  ) {
    return this.service.getInterviewCalendar(tenantId, date, week, month, interviewerId);
  }

  /**
   * Submits interview feedback and updates interview status.
   * 
   * This endpoint allows interviewers to submit feedback and
   * automatically updates the interview status and candidate progression.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param interviewId - The interview identifier
   * @param body - Request body containing feedback data
   * @param body.interviewerId - ID of the interviewer submitting feedback
   * @param body.rating - Overall interview rating (1-5)
   * @param body.feedback - Detailed feedback text
   * @param body.skills - Skills assessment scores
   * @param body.recommendation - Recommendation (hire, no-hire, maybe)
   * @param body.nextSteps - Recommended next steps
   * @returns Object containing feedback confirmation and updated status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "interviewerId": "interviewer-1",
   *   "rating": 4,
   *   "feedback": "Strong technical skills, good communication",
   *   "skills": {
   *     "technical": 4,
   *     "communication": 4,
   *     "problemSolving": 5
   *   },
   *   "recommendation": "hire",
   *   "nextSteps": "Schedule final interview with hiring manager"
   * }
   * 
   * // Response format
   * {
   *   "feedbackId": "feedback-123",
   *   "interviewId": "interview-789",
   *   "status": "COMPLETED",
   *   "rating": 4,
   *   "recommendation": "hire",
   *   "submittedAt": "2024-01-20T15:30:00Z"
   * }
   * ```
   */
  @Post(":interviewId/feedback")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  submitInterviewFeedback(
    @Param("tenantId") tenantId: string,
    @Param("interviewId") interviewId: string,
    @Body() body: { 
      interviewerId: string; 
      rating: number; 
      feedback: string; 
      skills: Record<string, number>; 
      recommendation: string; 
      nextSteps?: string 
    }
  ) {
    return this.service.submitInterviewFeedback(tenantId, interviewId, body.interviewerId, body.rating, body.feedback, body.skills, body.recommendation, body.nextSteps);
  }

  /**
   * Reschedules an existing interview.
   * 
   * This endpoint allows rescheduling of interviews with automatic
   * notification to all participants and calendar updates.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param interviewId - The interview identifier
   * @param body - Request body containing reschedule details
   * @param body.newScheduledAt - New scheduled date and time
   * @param body.reason - Reason for rescheduling
   * @param body.notifyParticipants - Whether to notify all participants
   * @returns Object containing reschedule confirmation and updated details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "newScheduledAt": "2024-01-22T14:00:00Z",
   *   "reason": "Candidate requested time change",
   *   "notifyParticipants": true
   * }
   * 
   * // Response format
   * {
   *   "interviewId": "interview-789",
   *   "oldScheduledAt": "2024-01-20T14:00:00Z",
   *   "newScheduledAt": "2024-01-22T14:00:00Z",
   *   "reason": "Candidate requested time change",
   *   "status": "RESCHEDULED",
   *   "notificationsSent": ["candidate-123", "interviewer-1", "interviewer-2"]
   * }
   * ```
   */
  @Put(":interviewId/reschedule")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  rescheduleInterview(
    @Param("tenantId") tenantId: string,
    @Param("interviewId") interviewId: string,
    @Body() body: { newScheduledAt: string; reason: string; notifyParticipants: boolean }
  ) {
    return this.service.rescheduleInterview(tenantId, interviewId, body.newScheduledAt, body.reason, body.notifyParticipants);
  }
}
