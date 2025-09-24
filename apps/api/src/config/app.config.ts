/**
 * @fileoverview Application Configuration Module
 * 
 * This module provides centralized configuration management for the CRM BenchSales AI Integration application.
 * It consolidates environment variables into a structured configuration object that can be easily consumed
 * by various modules throughout the application.
 * 
 * The configuration covers:
 * - Database connections (PostgreSQL, Redis)
 * - Authentication and authorization (Auth0)
 * - AI/ML services (OpenAI embeddings)
 * - File storage (S3-compatible storage)
 * - Search functionality (vector and lexical search)
 * - Matching algorithms for consultant-requirement pairing
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

/**
 * Configuration object interface defining the structure of application settings.
 * This interface ensures type safety when accessing configuration values throughout the application.
 */
interface AppConfiguration {
  /** PostgreSQL database connection URL */
  databaseUrl: string;
  /** Redis cache connection URL */
  redisUrl: string;
  /** OpenAI API key for AI services */
  openaiApiKey: string;
  /** OpenAI-specific configuration settings */
  openai: {
    /** Model name for text embeddings */
    embeddingModel: string;
    /** Number of dimensions for embedding vectors */
    embeddingDimensions: number;
  };
  /** S3-compatible storage configuration */
  storage: {
    /** S3 bucket name for file storage */
    bucket: string;
    /** AWS region for S3 operations */
    region: string;
    /** Custom S3 endpoint (for local development or non-AWS S3) */
    endpoint?: string;
    /** Whether to use path-style URLs instead of virtual-hosted-style */
    forcePathStyle: boolean;
    /** Time-to-live for signed URLs in seconds */
    signedUrlTtlSeconds: number;
  };
  /** Auth0 authentication and authorization settings */
  auth: {
    /** Auth0 audience identifier */
    audience: string;
    /** Auth0 issuer URL for JWT validation */
    issuer?: string;
    /** JSON Web Key Set URI for token verification */
    jwksUri?: string;
    /** Custom claim name for user roles */
    rolesClaim: string;
    /** Custom claim name for tenant identification */
    tenantClaim: string;
    /** Clock tolerance in seconds for JWT validation */
    clockTolerance: number;
    /** Whether to disable JWT verification (for development/testing) */
    disableVerification: boolean;
    /** Mock JWT token for testing purposes */
    mockJwt: string;
  };
  /** AI matching algorithm configuration */
  ai: {
    /** Weight for base matching criteria (0.0 to 1.0) */
    matchBaseWeight: number;
    /** Weight for skill-based matching (0.0 to 1.0) */
    matchSkillWeight: number;
    /** Weight for availability-based matching (0.0 to 1.0) */
    matchAvailWeight: number;
  };
  /** Search functionality configuration */
  search: {
    /** Weight for vector-based search results (0.0 to 1.0) */
    vectorWeight: number;
    /** Weight for lexical/text-based search results (0.0 to 1.0) */
    lexicalWeight: number;
    /** Maximum number of search results to return */
    maxResults: number;
  };
}

/**
 * Creates and returns the application configuration object by reading environment variables
 * and providing sensible defaults for development and production environments.
 * 
 * This function serves as the single source of truth for all application configuration.
 * It handles environment-specific logic, such as disabling JWT verification in non-production
 * environments and providing appropriate default values for different deployment scenarios.
 * 
 * @returns {AppConfiguration} Complete application configuration object
 * 
 * @example
 * ```typescript
 * const config = AppConfig();
 * console.log(config.databaseUrl); // PostgreSQL connection string
 * console.log(config.auth.audience); // Auth0 audience
 * ```
 * 
 * @throws {Error} May throw errors if critical environment variables are missing in production
 */
export const AppConfig = (): AppConfiguration => {
  // Environment variable for explicitly disabling Auth0 verification
  // Used for testing or when running without Auth0 integration
  const disableVerificationEnv = process.env.AUTH0_DISABLE_VERIFICATION;
  
  // Determines if the application is running in production environment
  // Used to set appropriate defaults and security settings
  const isProduction = process.env.NODE_ENV === "production";
  
  // S3 storage configuration for path-style URLs
  // Some S3-compatible services require path-style instead of virtual-hosted-style URLs
  const storageForcePathStyle = process.env.STORAGE_S3_FORCE_PATH_STYLE;

  // OpenAI embedding model configuration
  // Defaults to the latest and most capable embedding model
  const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-large";
  
  // Number of dimensions for embedding vectors
  // Higher dimensions provide better semantic understanding but use more storage/compute
  const embeddingDimensions = Number(process.env.OPENAI_EMBEDDING_DIMENSIONS ?? 3072);
  
  // Search algorithm weights - these must sum to 1.0 for proper result ranking
  // Vector weight determines how much semantic similarity influences results
  const vectorWeight = Number(process.env.SEARCH_VECTOR_WEIGHT ?? 0.6);
  
  // Lexical weight determines how much exact text matching influences results
  const lexicalWeight = Number(process.env.SEARCH_LEXICAL_WEIGHT ?? 0.4);

  return {
    /**
     * PostgreSQL database connection URL
     * Supports both local development and cloud-hosted databases
     */
    databaseUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/benchcrm",
    
    /**
     * Redis cache connection URL
     * Used for session storage, caching, and rate limiting
     */
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    
    /**
     * OpenAI API key for accessing AI services
     * Required for embedding generation and other AI-powered features
     */
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    
    /**
     * OpenAI service configuration
     * Controls which models and parameters are used for AI operations
     */
    openai: {
      embeddingModel,
      embeddingDimensions
    },
    
    /**
     * S3-compatible storage configuration
     * Handles file uploads, document storage, and signed URL generation
     */
    storage: {
      /** S3 bucket name - defaults to development bucket */
      bucket: process.env.STORAGE_S3_BUCKET ?? "benchcrm-dev",
      /** AWS region for S3 operations */
      region: process.env.STORAGE_S3_REGION ?? "us-east-1",
      /** Custom endpoint for local S3 or non-AWS services */
      endpoint: process.env.STORAGE_S3_ENDPOINT,
      /** Force path-style URLs for S3-compatible services */
      forcePathStyle: storageForcePathStyle ? storageForcePathStyle === "true" : false,
      /** TTL for signed URLs (15 minutes default) */
      signedUrlTtlSeconds: Number(process.env.STORAGE_SIGNED_URL_TTL ?? 900)
    },
    
    /**
     * Auth0 authentication and authorization configuration
     * Manages JWT token validation, user roles, and tenant isolation
     */
    auth: {
      /** Auth0 audience - falls back to client ID if not specified */
      audience: process.env.AUTH0_AUDIENCE ?? process.env.AUTH0_CLIENT_ID ?? "",
      /** Auth0 issuer URL - constructed from domain if not provided */
      issuer: process.env.AUTH0_ISSUER_URL ?? (process.env.AUTH0_DOMAIN ? `https://${process.env.AUTH0_DOMAIN}/` : undefined),
      /** JSON Web Key Set URI for token verification */
      jwksUri: process.env.AUTH0_JWKS_URI,
      /** Custom claim name for user roles in JWT tokens */
      rolesClaim: process.env.AUTH0_ROLES_CLAIM ?? "https://benchcrm.ai/roles",
      /** Custom claim name for tenant identification in JWT tokens */
      tenantClaim: process.env.AUTH0_TENANT_CLAIM ?? "https://benchcrm.ai/tenant",
      /** Clock tolerance in seconds for JWT validation (1 minute default) */
      clockTolerance: Number(process.env.AUTH0_CLOCK_TOLERANCE ?? 60),
      /** Disable verification in non-production or when explicitly set */
      disableVerification: disableVerificationEnv ? disableVerificationEnv === "true" : !isProduction,
      /** Mock JWT token for testing and development */
      mockJwt: process.env.AUTH0_MOCK_JWT ?? ""
    },
    
    /**
     * AI matching algorithm configuration
     * Controls how consultants are matched to requirements using weighted criteria
     * All weights should sum to 1.0 for proper algorithm functioning
     */
    ai: {
      /** Weight for base matching criteria (experience, location, etc.) */
      matchBaseWeight: Number(process.env.MATCH_BASE_WEIGHT ?? 0.2),
      /** Weight for skill-based matching (technical skills, certifications) */
      matchSkillWeight: Number(process.env.MATCH_SKILL_WEIGHT ?? 0.5),
      /** Weight for availability-based matching (schedule, project timeline) */
      matchAvailWeight: Number(process.env.MATCH_AVAIL_WEIGHT ?? 0.3)
    },
    
    /**
     * Search functionality configuration
     * Balances vector-based semantic search with traditional text search
     * Vector and lexical weights should sum to 1.0 for optimal results
     */
    search: {
      vectorWeight,
      lexicalWeight,
      /** Maximum number of search results to return per query */
      maxResults: Number(process.env.SEARCH_MAX_RESULTS ?? 20)
    }
  };
};
