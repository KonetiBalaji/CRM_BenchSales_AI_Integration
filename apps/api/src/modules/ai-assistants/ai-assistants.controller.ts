/**
 * @fileoverview AI Assistants Controller
 * 
 * This controller provides AI-powered assistant endpoints for the CRM BenchSales AI Integration application.
 * It offers intelligent automation features to help users with common tasks like resume summarization,
 * outreach drafting, job description structuring, and interview note processing.
 * 
 * Key features:
 * - Resume summarization with intelligent content extraction
 * - Automated outreach message drafting
 * - Job description to structured data conversion
 * - Interview notes summarization and organization
 * - Post-call CRM update processing with metadata extraction
 * - Role-based access control for different user types
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Body, Controller, Param, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { AiAssistantsService } from "./ai-assistants.service";

/**
 * Controller for AI-powered assistant functionality.
 * 
 * This controller provides endpoints for various AI-assisted tasks that help
 * streamline common CRM operations. All endpoints are tenant-scoped and
 * protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Summarize a consultant's resume
 * POST /tenants/{tenantId}/assistants/resume/{consultantId}/summarize
 * 
 * // Draft an outreach message
 * POST /tenants/{tenantId}/assistants/outreach/draft
 * {
 *   "consultantName": "John Doe",
 *   "roleTitle": "Senior Developer",
 *   "clientName": "Tech Corp"
 * }
 * ```
 */
@Controller("tenants/:tenantId/assistants")
export class AiAssistantsController {
  /**
   * Initializes the AI assistants controller with the service dependency.
   * 
   * @param service - The AI assistants service for business logic
   */
  constructor(private readonly service: AiAssistantsService) {}

  /**
   * Summarizes a consultant's resume using AI-powered content extraction.
   * 
   * This endpoint retrieves consultant information from the vector search index
   * and generates a concise summary of their key qualifications and experience.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param consultantId - The consultant identifier to summarize
   * @returns Object containing consultant summary and citation information
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "consultantId": "consultant-123",
   *   "summary": "Senior developer with 5+ years experience in React and Node.js...",
   *   "citations": [{
   *     "entityType": "CONSULTANT",
   *     "entityId": "consultant-123"
   *   }]
   * }
   * ```
   */
  @Post("resume/:consultantId/summarize")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  summarizeResume(@Param("tenantId") tenantId: string, @Param("consultantId") consultantId: string) {
    return this.service.summarizeResume(tenantId, consultantId);
  }

  /**
   * Drafts an outreach message for contacting consultants about opportunities.
   * 
   * This endpoint generates personalized outreach messages based on the
   * consultant's name, role title, and optional client information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing outreach parameters
   * @param body.consultantName - Name of the consultant to contact
   * @param body.roleTitle - Title of the role/opportunity
   * @param body.clientName - Optional client company name
   * @returns Object containing subject line and message body
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "consultantName": "John Doe",
   *   "roleTitle": "Senior React Developer",
   *   "clientName": "Tech Corp"
   * }
   * 
   * // Response format
   * {
   *   "subject": "Senior React Developer opportunity",
   *   "body": "Hi John Doe,\n\nWe have an opportunity for Senior React Developer at Tech Corp.\n\nWould you be open to a quick chat?"
   * }
   * ```
   */
  @Post("outreach/draft")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  draftOutreach(
    @Param("tenantId") tenantId: string,
    @Body() body: { consultantName: string; roleTitle: string; clientName?: string }
  ) {
    return this.service.draftOutreach(tenantId, body.consultantName, body.roleTitle, body.clientName);
  }

  /**
   * Converts unstructured job description text into structured requirement data.
   * 
   * This endpoint uses AI to extract key information from job descriptions
   * and structure it into a standardized format for the CRM system.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing the job description text
   * @param body.text - Raw job description text to process
   * @returns Structured requirement data extracted from the text
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "text": "We are looking for a Senior React Developer with 5+ years experience..."
   * }
   * 
   * // Response format (structured requirement data)
   * {
   *   "title": "Senior React Developer",
   *   "skills": ["React", "JavaScript", "Node.js"],
   *   "experience": "5+ years",
   *   "location": "Remote",
   *   // ... other structured fields
   * }
   * ```
   */
  @Post("jd/structure")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  jdToStructured(@Param("tenantId") tenantId: string, @Body() body: { text: string }) {
    return this.service.jdToStructured(tenantId, body.text);
  }

  /**
   * Summarizes and structures interview notes for better organization.
   * 
   * This endpoint processes raw interview notes and extracts key points,
   * creating both a summary and structured bullet points for easy reference.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing interview notes
   * @param body.notes - Raw interview notes text to process
   * @returns Object containing summary and structured bullet points
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "notes": "- Strong technical skills in React\n- Good communication\n- Available immediately"
   * }
   * 
   * // Response format
   * {
   *   "summary": "Strong technical skills in React; Good communication; Available immediately",
   *   "bullets": [
   *     "Strong technical skills in React",
   *     "Good communication",
   *     "Available immediately"
   *   ]
   * }
   * ```
   */
  @Post("interview/summarize")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  interviewSummary(@Param("tenantId") tenantId: string, @Body() body: { notes: string }) {
    return this.service.summarizeInterviewNotes(tenantId, body.notes);
  }

  /**
   * Processes post-call notes and extracts metadata for CRM updates.
   * 
   * This endpoint analyzes post-call notes to extract tags, action items,
   * and other metadata that can be used to update CRM records automatically.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing post-call information
   * @param body.consultantId - Optional consultant identifier
   * @param body.requirementId - Optional requirement identifier
   * @param body.notes - Post-call notes to process
   * @returns Object containing extracted metadata for CRM updates
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "consultantId": "consultant-123",
   *   "requirementId": "req-456",
   *   "notes": "Great candidate! #react #senior TODO: Schedule follow-up interview"
   * }
   * 
   * // Response format
   * {
   *   "metadata": {
   *     "tags": ["#react", "#senior"],
   *     "actionItems": ["Schedule follow-up interview"]
   *   }
   * }
   * ```
   */
  @Post("post-call/update")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  postCallUpdate(
    @Param("tenantId") tenantId: string,
    @Body() body: { consultantId?: string; requirementId?: string; notes: string }
  ) {
    return this.service.postCallCrmUpdate(tenantId, body);
  }
}



