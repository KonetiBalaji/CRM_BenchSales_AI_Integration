/**
 * @fileoverview Match Summary Data Transfer Objects
 * 
 * This file contains interfaces for match summary functionality in the CRM BenchSales AI Integration application.
 * These interfaces define the structure for consultant-requirement matching analysis and summary generation.
 * 
 * Key interfaces:
 * - MatchSummaryFacts: Input data structure for match analysis
 * - MatchSummaryResponse: Output structure for generated match summaries
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

/**
 * Interface defining the input facts for match summary generation.
 * 
 * This interface contains all the data needed to generate a comprehensive
 * summary of a consultant-requirement match, including both entities'
 * information and calculated matching signals.
 * 
 * @example
 * ```typescript
 * const facts: MatchSummaryFacts = {
 *   requirement: {
 *     id: "req-123",
 *     title: "Senior React Developer",
 *     clientName: "Tech Corp",
 *     location: "Remote",
 *     minRate: 100,
 *     maxRate: 150,
 *     topSkills: ["React", "JavaScript", "Node.js"]
 *   },
 *   consultant: {
 *     id: "consultant-456",
 *     name: "John Doe",
 *     availability: "Immediate",
 *     location: "San Francisco",
 *     rate: 120,
 *     alignedSkills: ["React", "JavaScript", "TypeScript"]
 *   },
 *   signals: {
 *     linearScore: 0.85,
 *     ltrScore: 0.92,
 *     finalScore: 0.88,
 *     retrievalScore: 0.90,
 *     featureLabels: ["skill_match", "rate_alignment", "availability"],
 *     availabilityScore: 0.95,
 *     locationMatch: 0.80,
 *     rateAlignment: 0.85
 *   },
 *   deltas: {
 *     locationStatus: "REMOTE_OK",
 *     rateDelta: 0.05,
 *     availabilityLabel: "Excellent"
 *   }
 * };
 * ```
 */
export interface MatchSummaryFacts {
  /** Requirement information and details */
  requirement: {
    /** Unique identifier for the requirement */
    id: string;
    /** Job title or position name */
    title: string;
    /** Client company name */
    clientName: string;
    /** Job location (optional) */
    location?: string | null;
    /** Minimum hourly rate (optional) */
    minRate?: number | null;
    /** Maximum hourly rate (optional) */
    maxRate?: number | null;
    /** Top required skills for the position */
    topSkills: string[];
  };
  
  /** Consultant information and profile */
  consultant: {
    /** Unique identifier for the consultant */
    id: string;
    /** Consultant's full name */
    name: string;
    /** Availability status */
    availability: string;
    /** Consultant's location (optional) */
    location?: string | null;
    /** Consultant's hourly rate (optional) */
    rate?: number | null;
    /** Skills that align with the requirement */
    alignedSkills: string[];
  };
  
  /** Calculated matching signals and scores */
  signals: {
    /** Linear matching score (0-1) */
    linearScore: number;
    /** Learning-to-rank score (0-1) */
    ltrScore: number;
    /** Final combined score (0-1) */
    finalScore: number;
    /** Vector retrieval score (0-1) */
    retrievalScore: number;
    /** Labels for top matching features */
    featureLabels: string[];
    /** Availability matching score (0-1) */
    availabilityScore: number;
    /** Location matching score (0-1) */
    locationMatch: number;
    /** Rate alignment score (0-1) */
    rateAlignment: number;
  };
  
  /** Calculated differences and status indicators */
  deltas: {
    /** Location matching status (MATCH, REMOTE_OK, NEARBY, MISMATCH) */
    locationStatus: string;
    /** Rate difference as percentage (optional) */
    rateDelta?: number | null;
    /** Human-readable availability label */
    availabilityLabel: string;
  };
}

/**
 * Interface defining the response structure for match summary generation.
 * 
 * This interface contains the generated summary, highlights, confidence score,
 * and metadata about the summary generation process.
 * 
 * @example
 * ```typescript
 * const response: MatchSummaryResponse = {
 *   summary: "John Doe aligns on React, JavaScript. Hybrid retrieval confidence 90% for Senior React Developer. San Francisco available for remote-friendly requirement (Remote). Rate within target band (5% variance). Immediate availability (excellent).",
 *   highlights: [
 *     "Top features: skill_match, rate_alignment, availability",
 *     "Availability score 95%",
 *     "Rate delta +0.05"
 *   ],
 *   confidence: 0.875,
 *   grounded: true,
 *   provider: "rule-based"
 * };
 * ```
 */
export interface MatchSummaryResponse {
  /** Generated natural language summary of the match */
  summary: string;
  /** Key highlights and important points about the match */
  highlights: string[];
  /** Confidence score for the match (0-1) */
  confidence: number;
  /** Whether the summary is grounded in factual data */
  grounded: boolean;
  /** AI provider or method used for summary generation */
  provider: string;
}
