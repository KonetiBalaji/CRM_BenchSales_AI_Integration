/**
 * @fileoverview AI Assistants Service
 * 
 * This service provides AI-powered assistant functionality for the CRM BenchSales AI Integration application.
 * It implements intelligent automation features that help streamline common CRM operations by leveraging
 * AI services, vector search, and natural language processing capabilities.
 * 
 * Key features:
 * - Resume summarization using vector search and content extraction
 * - Automated outreach message generation
 * - Job description to structured data conversion via AI gateway
 * - Interview notes processing and summarization
 * - Post-call metadata extraction (tags, action items)
 * - Integration with multiple AI and search services
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { VectorSearchService } from "../vector-search/vector-search.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { RequirementsService } from "../requirements/requirements.service";

/**
 * Service for AI-powered assistant functionality.
 * 
 * This service provides intelligent automation features that help users
 * with common CRM tasks by leveraging AI services, vector search, and
 * natural language processing. It integrates with multiple services to
 * provide comprehensive AI assistance.
 * 
 * @example
 * ```typescript
 * // Summarize a consultant's resume
 * const summary = await this.aiAssistants.summarizeResume(tenantId, consultantId);
 * 
 * // Draft an outreach message
 * const message = await this.aiAssistants.draftOutreach(tenantId, "John Doe", "Senior Developer", "Tech Corp");
 * 
 * // Process interview notes
 * const processed = await this.aiAssistants.summarizeInterviewNotes(tenantId, rawNotes);
 * ```
 */
@Injectable()
export class AiAssistantsService {
  /**
   * Initializes the AI assistants service with required dependencies.
   * 
   * @param vectorSearch - Service for vector-based search operations
   * @param aiGateway - Service for AI-powered data extraction and processing
   * @param requirements - Service for requirement management operations
   */
  constructor(
    private readonly vectorSearch: VectorSearchService,
    private readonly aiGateway: AiGatewayService,
    private readonly requirements: RequirementsService
  ) {}

  /**
   * Summarizes a consultant's resume using vector search and content extraction.
   * 
   * This method retrieves consultant information from the vector search index
   * and generates a concise summary by extracting the most relevant sentences
   * from their profile content.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param consultantId - The consultant identifier to summarize
   * @returns Object containing consultant summary and citation information
   * 
   * @example
   * ```typescript
   * const result = await this.aiAssistants.summarizeResume("tenant-123", "consultant-456");
   * console.log(result.summary); // "Senior developer with 5+ years experience..."
   * console.log(result.citations); // [{ entityType: "CONSULTANT", entityId: "consultant-456" }]
   * ```
   */
  async summarizeResume(tenantId: string, consultantId: string) {
    // Search for consultant information in the vector index
    const results = await this.vectorSearch.hybridSearch(tenantId, {
      query: consultantId,
      entityTypes: ["CONSULTANT" as any],
      limit: 1
    });
    
    const top = results[0];
    const content = top?.content ?? "";
    
    // Extract and summarize the most relevant sentences
    const sentences = content.split(/\.|\n/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
    const summary = sentences.join(". ");
    
    return { 
      consultantId, 
      summary, 
      citations: top ? [{ entityType: top.entityType, entityId: top.entityId }] : [] 
    };
  }

  /**
   * Drafts an outreach message for contacting consultants about opportunities.
   * 
   * This method generates personalized outreach messages using a template-based
   * approach. It creates professional, concise messages that can be customized
   * based on the consultant's name, role title, and client information.
   * 
   * @param _tenantId - The tenant identifier (currently unused but kept for consistency)
   * @param consultantName - Name of the consultant to contact
   * @param roleTitle - Title of the role/opportunity
   * @param clientName - Optional client company name
   * @returns Object containing subject line and message body
   * 
   * @example
   * ```typescript
   * const message = await this.aiAssistants.draftOutreach(
   *   "tenant-123", 
   *   "John Doe", 
   *   "Senior React Developer", 
   *   "Tech Corp"
   * );
   * console.log(message.subject); // "Senior React Developer opportunity"
   * console.log(message.body); // "Hi John Doe,\n\nWe have an opportunity..."
   * ```
   */
  async draftOutreach(_tenantId: string, consultantName: string, roleTitle: string, clientName?: string) {
    // Generate personalized outreach message lines
    const lines = [
      `Hi ${consultantName},`,
      `We have an opportunity for ${roleTitle}${clientName ? ` at ${clientName}` : ""}.`,
      `Would you be open to a quick chat?`
    ];
    
    return { 
      subject: `${roleTitle} opportunity`, 
      body: lines.join("\n\n") 
    };
  }

  /**
   * Converts unstructured job description text into structured requirement data.
   * 
   * This method uses the AI gateway service to extract key information from
   * job descriptions and structure it into a standardized format suitable
   * for the CRM system.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param text - Raw job description text to process
   * @returns Structured requirement data extracted from the text
   * 
   * @example
   * ```typescript
   * const structured = await this.aiAssistants.jdToStructured(
   *   "tenant-123", 
   *   "We are looking for a Senior React Developer with 5+ years experience..."
   * );
   * console.log(structured.title); // "Senior React Developer"
   * console.log(structured.skills); // ["React", "JavaScript", "Node.js"]
   * ```
   */
  async jdToStructured(tenantId: string, text: string) {
    // Use AI gateway to extract structured data from job description
    const extracted = await this.aiGateway.extractRequirement(tenantId, text);
    return extracted;
  }

  /**
   * Summarizes and structures interview notes for better organization.
   * 
   * This method processes raw interview notes by extracting bullet points
   * and creating both a summary and structured list for easy reference.
   * It handles various note formats including bullet points and line breaks.
   * 
   * @param _tenantId - The tenant identifier (currently unused but kept for consistency)
   * @param notes - Raw interview notes text to process
   * @returns Object containing summary and structured bullet points
   * 
   * @example
   * ```typescript
   * const processed = await this.aiAssistants.summarizeInterviewNotes(
   *   "tenant-123", 
   *   "- Strong technical skills\n- Good communication\n- Available immediately"
   * );
   * console.log(processed.summary); // "Strong technical skills; Good communication; Available immediately"
   * console.log(processed.bullets); // ["Strong technical skills", "Good communication", "Available immediately"]
   * ```
   */
  async summarizeInterviewNotes(_tenantId: string, notes: string) {
    // Extract bullet points from various formats
    const bullets = notes.split(/\n\s*\-\s*|\n/).map((b) => b.trim()).filter(Boolean).slice(0, 8);
    
    // Create summary from first 5 bullet points
    const summary = bullets.slice(0, 5).join("; ");
    
    return { summary, bullets };
  }

  /**
   * Processes post-call notes and extracts metadata for CRM updates.
   * 
   * This method analyzes post-call notes to extract hashtags and action items
   * that can be used to automatically update CRM records with relevant metadata.
   * It uses regex patterns to identify tags and TODO items.
   * 
   * @param _tenantId - The tenant identifier (currently unused but kept for consistency)
   * @param payload - Object containing post-call information
   * @param payload.consultantId - Optional consultant identifier
   * @param payload.requirementId - Optional requirement identifier
   * @param payload.notes - Post-call notes to process
   * @returns Object containing extracted metadata for CRM updates
   * 
   * @example
   * ```typescript
   * const metadata = await this.aiAssistants.postCallCrmUpdate("tenant-123", {
   *   consultantId: "consultant-456",
   *   requirementId: "req-789",
   *   notes: "Great candidate! #react #senior TODO: Schedule follow-up interview"
   * });
   * console.log(metadata.metadata.tags); // ["#react", "#senior"]
   * console.log(metadata.metadata.actionItems); // ["Schedule follow-up interview"]
   * ```
   */
  async postCallCrmUpdate(_tenantId: string, payload: { consultantId?: string; requirementId?: string; notes: string }) {
    // Extract hashtags from notes (case-insensitive, deduplicated)
    const tags = Array.from(new Set(
      (payload.notes.match(/#[a-z0-9_\-]+/gi) ?? []).map((s) => s.toLowerCase())
    ));
    
    // Extract action items from TODO patterns
    const actionItems = (payload.notes.match(/TODO[:\-]\s*(.+)/gi) ?? [])
      .map((m) => m.replace(/TODO[:\-]\s*/i, "").trim());
    
    return {
      metadata: { tags, actionItems } as Prisma.JsonObject
    };
  }
}



