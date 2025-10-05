/**
 * @fileoverview AI Gateway Data Transfer Objects
 * 
 * This file contains DTOs (Data Transfer Objects) for the AI Gateway module of the CRM BenchSales AI Integration application.
 * These DTOs define the structure and validation rules for incoming requests to AI-powered endpoints.
 * 
 * Key DTOs:
 * - ExtractRequirementDto: For job description text processing
 * - EmbedTextDto: For text embedding generation requests
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { ArrayMinSize, IsArray, IsString, MinLength } from "class-validator";

/**
 * Data Transfer Object for requirement extraction requests.
 * 
 * This DTO validates the input text for job description processing,
 * ensuring it meets minimum length requirements for meaningful extraction.
 * 
 * @example
 * ```typescript
 * const dto: ExtractRequirementDto = {
 *   text: "We are looking for a Senior React Developer with 5+ years experience in modern web development..."
 * };
 * ```
 */
export class ExtractRequirementDto {
  /** 
   * The job description text to extract structured data from.
   * Must be at least 10 characters long to ensure meaningful content.
   */
  @IsString()
  @MinLength(10)
  text!: string;
}

/**
 * Data Transfer Object for text embedding generation requests.
 * 
 * This DTO validates the array of text inputs for embedding generation,
 * ensuring at least one text is provided for processing.
 * 
 * @example
 * ```typescript
 * const dto: EmbedTextDto = {
 *   texts: [
 *     "Senior React Developer",
 *     "JavaScript Expert",
 *     "Node.js Specialist"
 *   ]
 * };
 * ```
 */
export class EmbedTextDto {
  /** 
   * Array of text strings to generate embeddings for.
   * Must contain at least one text item for processing.
   */
  @IsArray()
  @ArrayMinSize(1)
  texts!: string[];
}
