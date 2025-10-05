/**
 * @fileoverview AI Gateway Controller
 * 
 * This controller provides AI-powered data processing endpoints for the CRM BenchSales AI Integration application.
 * It serves as a gateway to various AI services for text processing, requirement extraction, and embedding generation.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * Key features:
 * - Job description to structured requirement extraction
 * - Text embedding generation for vector search
 * - AI activity logging and cost tracking
 * - Role-based access control for different user types
 * - Tenant-scoped data processing and isolation
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
import { AiGatewayService } from "./ai-gateway.service";
import { EmbedTextDto, ExtractRequirementDto } from "./dto/ai-gateway.dto";

/**
 * Controller for AI-powered data processing and analysis.
 * 
 * This controller provides endpoints for various AI operations including
 * requirement extraction from job descriptions and text embedding generation.
 * All operations are logged for cost tracking and audit purposes.
 * 
 * @example
 * ```typescript
 * // Extract structured data from job description
 * POST /tenants/{tenantId}/ai/extract-requirement
 * {
 *   "text": "We are looking for a Senior React Developer with 5+ years experience..."
 * }
 * 
 * // Generate embeddings for text
 * POST /tenants/{tenantId}/ai/embed
 * {
 *   "texts": ["React Developer", "JavaScript Expert", "Node.js Specialist"]
 * }
 * ```
 */
@Controller("tenants/:tenantId/ai")
export class AiGatewayController {
  /**
   * Initializes the AI gateway controller with the service dependency.
   * 
   * @param aiGatewayService - The AI gateway service for business logic
   */
  constructor(private readonly aiGatewayService: AiGatewayService) {}

  /**
   * Extracts structured requirement data from unstructured job description text.
   * 
   * This endpoint uses pattern matching and natural language processing to extract
   * key information from job descriptions including title, location, client name,
   * rate information, and required skills.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param dto - Request body containing the job description text
   * @param dto.text - Raw job description text to process (minimum 10 characters)
   * @returns Structured requirement data extracted from the text
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "text": "Role: Senior React Developer\nLocation: Remote\nClient: Tech Corp\nRate: $120/hour\nSkills: React, JavaScript, Node.js"
   * }
   * 
   * // Response format
   * {
   *   "title": "Senior React Developer",
   *   "clientName": "Tech Corp",
   *   "location": "Remote",
   *   "suggestedRate": 120,
   *   "skills": ["React", "JavaScript", "Node.js"]
   * }
   * ```
   */
  @Post("extract-requirement")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  extractRequirement(@Param("tenantId") tenantId: string, @Body() dto: ExtractRequirementDto) {
    return this.aiGatewayService.extractRequirement(tenantId, dto.text);
  }

  /**
   * Generates vector embeddings for the provided text inputs.
   * 
   * This endpoint creates vector embeddings from text inputs that can be used
   * for semantic search, similarity matching, and other AI-powered operations.
   * The embeddings are generated using a deterministic algorithm for consistency.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param dto - Request body containing text inputs to embed
   * @param dto.texts - Array of text strings to generate embeddings for (minimum 1 item)
   * @returns Array of vector embeddings corresponding to the input texts
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "texts": [
   *     "Senior React Developer with 5+ years experience",
   *     "JavaScript expert with Node.js background",
   *     "Full-stack developer specializing in modern web technologies"
   *   ]
   * }
   * 
   * // Response format
   * [
   *   [0.1, 0.2, 0.3, ...], // 32-dimensional vector for first text
   *   [0.4, 0.5, 0.6, ...], // 32-dimensional vector for second text
   *   [0.7, 0.8, 0.9, ...]  // 32-dimensional vector for third text
   * ]
   * ```
   */
  @Post("embed")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  embed(@Param("tenantId") tenantId: string, @Body() dto: EmbedTextDto) {
    return this.aiGatewayService.embedTexts(tenantId, dto.texts);
  }
}
