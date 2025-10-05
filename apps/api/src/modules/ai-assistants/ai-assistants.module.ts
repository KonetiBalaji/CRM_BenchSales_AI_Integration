/**
 * @fileoverview AI Assistants Module
 * 
 * This module provides AI-powered assistant functionality for the CRM BenchSales AI Integration application.
 * It integrates multiple services to offer intelligent automation features that help streamline common
 * CRM operations through AI-powered content processing, summarization, and automation.
 * 
 * The module provides:
 * - AI-powered resume summarization and content extraction
 * - Automated outreach message generation
 * - Job description to structured data conversion
 * - Interview notes processing and organization
 * - Post-call metadata extraction and CRM updates
 * - Integration with AI gateway, vector search, and requirements services
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Module } from "@nestjs/common";
import { AiAssistantsService } from "./ai-assistants.service";
import { AiAssistantsController } from "./ai-assistants.controller";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { VectorSearchModule } from "../vector-search/vector-search.module";
import { RequirementsModule } from "../requirements/requirements.module";

/**
 * Module for AI-powered assistant functionality.
 * 
 * This module provides intelligent automation features that help users with
 * common CRM tasks by leveraging AI services, vector search, and natural
 * language processing capabilities. It integrates multiple services to
 * provide comprehensive AI assistance.
 * 
 * The module depends on:
 * - AiGatewayModule: For AI-powered data extraction and processing
 * - VectorSearchModule: For vector-based search and content retrieval
 * - RequirementsModule: For requirement management operations
 * 
 * @example
 * ```typescript
 * // Import the module in your application
 * @Module({
 *   imports: [AiAssistantsModule],
 *   // ... other module configuration
 * })
 * export class AppModule {}
 * ```
 * 
 * @example
 * ```typescript
 * // Use the service in other modules
 * @Injectable()
 * export class SomeService {
 *   constructor(private readonly aiAssistants: AiAssistantsService) {}
 *   
 *   async processConsultant(consultantId: string) {
 *     const summary = await this.aiAssistants.summarizeResume(tenantId, consultantId);
 *     return summary;
 *   }
 * }
 * ```
 */
@Module({
  imports: [AiGatewayModule, VectorSearchModule, RequirementsModule],
  controllers: [AiAssistantsController],
  providers: [AiAssistantsService]
})
export class AiAssistantsModule {}



