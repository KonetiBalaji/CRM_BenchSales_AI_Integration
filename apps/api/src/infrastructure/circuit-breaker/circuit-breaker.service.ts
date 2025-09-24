/**
 * @fileoverview Circuit Breaker Service
 * 
 * This service implements the circuit breaker pattern to provide fault tolerance and resilience
 * for the CRM BenchSales AI Integration application. It monitors service calls and automatically
 * prevents calls to failing services, allowing them time to recover.
 * 
 * The circuit breaker has three states:
 * - CLOSED: Normal operation, calls pass through
 * - OPEN: Service is failing, calls are blocked
 * - HALF_OPEN: Testing if service has recovered, limited calls allowed
 * 
 * Key features:
 * - Configurable failure thresholds and recovery timeouts
 * - State persistence using Redis cache
 * - Predefined configurations for common services
 * - Comprehensive monitoring and statistics
 * - Automatic state transitions based on success/failure rates
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CacheService } from "../cache/cache.service";

/**
 * Configuration interface for circuit breaker behavior.
 * 
 * Defines the parameters that control when a circuit opens, how long it stays open,
 * and how it transitions between states.
 */
export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;
  /** Time in milliseconds before attempting recovery (OPEN -> HALF_OPEN) */
  recoveryTimeout: number;
  /** Time window in milliseconds for monitoring failures */
  monitoringPeriod: number;
  /** Maximum calls allowed in half-open state before closing or reopening */
  halfOpenMaxCalls: number;
}

/**
 * State interface representing the current status of a circuit breaker.
 * 
 * Tracks the circuit's current state, failure counts, timing information,
 * and call statistics for monitoring and decision-making.
 */
export interface CircuitBreakerState {
  /** Current state of the circuit breaker */
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  /** Number of consecutive failures */
  failureCount: number;
  /** Timestamp of the last failure */
  lastFailureTime: number;
  /** Timestamp when the next recovery attempt is allowed */
  nextAttemptTime: number;
  /** Number of successful calls in half-open state */
  successCount: number;
  /** Total number of calls made through this circuit */
  totalCalls: number;
}

/**
 * Circuit breaker service that implements the circuit breaker pattern for fault tolerance.
 * 
 * This service monitors service calls and automatically opens circuits when failure rates
 * exceed configured thresholds. It provides predefined configurations for common services
 * and allows custom configurations for specific use cases.
 * 
 * @example
 * ```typescript
 * // Using predefined circuit breaker for external API
 * const result = await this.circuitBreaker.executeExternalApi('payment-service', async () => {
 *   return await this.paymentApi.processPayment(paymentData);
 * });
 * 
 * // Using custom configuration
 * const result = await this.circuitBreaker.execute('custom-service', async () => {
 *   return await this.customService.doSomething();
 * }, {
 *   failureThreshold: 3,
 *   recoveryTimeout: 30000,
 *   monitoringPeriod: 120000,
 *   halfOpenMaxCalls: 2
 * });
 * ```
 */
@Injectable()
export class CircuitBreakerService {
  /** Logger instance for circuit breaker operations and state changes */
  private readonly logger = new Logger(CircuitBreakerService.name);
  
  /** Default configuration for circuit breaker behavior */
  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,        // Open circuit after 5 failures
    recoveryTimeout: 60000,     // Wait 1 minute before attempting recovery
    monitoringPeriod: 300000,   // Monitor failures over 5-minute window
    halfOpenMaxCalls: 3         // Allow 3 calls in half-open state
  };

  /**
   * Initializes the circuit breaker service with required dependencies.
   * 
   * @param cache - Cache service for persisting circuit breaker state
   * @param configService - Configuration service for accessing settings
   */
  constructor(
    private readonly cache: CacheService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Executes an operation through the circuit breaker with automatic state management.
   * 
   * This is the main method for using circuit breakers. It checks the current state,
   * applies circuit breaker logic, executes the operation, and updates the state
   * based on success or failure.
   * 
   * @template T - The return type of the operation
   * @param key - Unique identifier for this circuit breaker instance
   * @param operation - The async operation to execute
   * @param config - Optional configuration override for this execution
   * @returns The result of the operation if successful
   * @throws Error if circuit is open or operation fails
   * 
   * @example
   * ```typescript
   * try {
   *   const result = await this.circuitBreaker.execute('user-service', async () => {
   *     return await this.userService.getUser(userId);
   *   });
   *   return result;
   * } catch (error) {
   *   if (error.message.includes('Circuit breaker is OPEN')) {
   *     // Handle circuit breaker blocking the call
   *     return this.getCachedUser(userId);
   *   }
   *   throw error; // Re-throw actual service errors
   * }
   * ```
   */
  async execute<T>(
    key: string,
    operation: () => Promise<T>,
    config: Partial<CircuitBreakerConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const state = await this.getState(key);
    
    // Check if circuit is open and not ready for recovery
    if (state.state === "OPEN") {
      if (Date.now() < state.nextAttemptTime) {
        throw new Error(`Circuit breaker is OPEN for ${key}. Next attempt at ${new Date(state.nextAttemptTime)}`);
      }
      
      // Transition to half-open state for testing recovery
      await this.setState(key, {
        ...state,
        state: "HALF_OPEN",
        successCount: 0
      });
    }
    
    // Check half-open call limit to prevent overwhelming recovering service
    if (state.state === "HALF_OPEN" && state.successCount >= finalConfig.halfOpenMaxCalls) {
      throw new Error(`Circuit breaker HALF_OPEN call limit exceeded for ${key}`);
    }
    
    try {
      const result = await operation();
      await this.recordSuccess(key, finalConfig);
      return result;
    } catch (error) {
      await this.recordFailure(key, finalConfig);
      throw error;
    }
  }

  /**
   * Retrieves the current state of a circuit breaker from cache.
   * 
   * @param key - The circuit breaker key to get state for
   * @returns Current circuit breaker state or default CLOSED state
   */
  async getState(key: string): Promise<CircuitBreakerState> {
    const stateKey = `circuit_breaker:${key}`;
    const state = await this.cache.get<CircuitBreakerState>(stateKey);
    
    if (!state) {
      return {
        state: "CLOSED",
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
        successCount: 0,
        totalCalls: 0
      };
    }
    
    // Check if we should transition from OPEN to HALF_OPEN based on time
    if (state.state === "OPEN" && Date.now() >= state.nextAttemptTime) {
      return {
        ...state,
        state: "HALF_OPEN",
        successCount: 0
      };
    }
    
    return state;
  }

  /**
   * Persists the circuit breaker state to cache.
   * 
   * @param key - The circuit breaker key
   * @param state - The state to persist
   */
  async setState(key: string, state: CircuitBreakerState): Promise<void> {
    const stateKey = `circuit_breaker:${key}`;
    await this.cache.set(stateKey, state, 3600); // Cache for 1 hour
  }

  /**
   * Records a successful operation and updates circuit breaker state.
   * 
   * In HALF_OPEN state, successful calls can transition the circuit back to CLOSED
   * if enough successes are recorded within the configured limit.
   * 
   * @param key - The circuit breaker key
   * @param config - Circuit breaker configuration
   */
  async recordSuccess(key: string, config: CircuitBreakerConfig): Promise<void> {
    const state = await this.getState(key);
    const newState: CircuitBreakerState = {
      ...state,
      successCount: state.successCount + 1,
      totalCalls: state.totalCalls + 1
    };
    
    // If in half-open state and we have enough successes, close the circuit
    if (state.state === "HALF_OPEN" && newState.successCount >= config.halfOpenMaxCalls) {
      newState.state = "CLOSED";
      newState.failureCount = 0;
      this.logger.log(`Circuit breaker CLOSED for ${key} after successful recovery`);
    }
    
    await this.setState(key, newState);
  }

  /**
   * Records a failed operation and updates circuit breaker state.
   * 
   * Tracks failure counts and opens the circuit if the failure threshold is exceeded.
   * In HALF_OPEN state, any failure immediately reopens the circuit.
   * 
   * @param key - The circuit breaker key
   * @param config - Circuit breaker configuration
   */
  async recordFailure(key: string, config: CircuitBreakerConfig): Promise<void> {
    const state = await this.getState(key);
    const now = Date.now();
    
    // Reset failure count if monitoring period has passed
    const failureCount = (now - state.lastFailureTime) > config.monitoringPeriod 
      ? 1 
      : state.failureCount + 1;
    
    const newState: CircuitBreakerState = {
      ...state,
      state: state.state === "HALF_OPEN" ? "OPEN" : state.state,
      failureCount,
      lastFailureTime: now,
      totalCalls: state.totalCalls + 1
    };
    
    // Open circuit if failure threshold exceeded
    if (failureCount >= config.failureThreshold) {
      newState.state = "OPEN";
      newState.nextAttemptTime = now + config.recoveryTimeout;
      this.logger.warn(`Circuit breaker OPENED for ${key} after ${failureCount} failures`);
    }
    
    await this.setState(key, newState);
  }

  /**
   * Resets a circuit breaker to its initial CLOSED state.
   * 
   * @param key - The circuit breaker key to reset
   */
  async reset(key: string): Promise<void> {
    const stateKey = `circuit_breaker:${key}`;
    await this.cache.del(stateKey);
    this.logger.log(`Circuit breaker reset for ${key}`);
  }

  /**
   * Retrieves statistics for all circuit breakers.
   * 
   * @returns Object containing state information for all circuit breakers
   * @note This is a placeholder implementation. In production, this would scan
   * all circuit breaker keys in Redis to provide comprehensive statistics.
   */
  async getStats(): Promise<Record<string, CircuitBreakerState>> {
    // This would need to scan all circuit breaker keys in production
    // For now, return empty object
    return {};
  }

  /**
   * Predefined circuit breaker for database operations with optimized settings.
   * 
   * Uses conservative settings suitable for database operations:
   * - Lower failure threshold (3) due to critical nature
   * - Shorter recovery timeout (30s) for faster recovery
   * - Limited half-open calls (2) to avoid overwhelming recovering database
   * 
   * @template T - The return type of the database operation
   * @param operation - The database operation to execute
   * @returns The result of the database operation
   * 
   * @example
   * ```typescript
   * const user = await this.circuitBreaker.executeDatabase(async () => {
   *   return await this.prisma.user.findUnique({ where: { id: userId } });
   * });
   * ```
   */
  async executeDatabase<T>(operation: () => Promise<T>): Promise<T> {
    return this.execute("database", operation, {
      failureThreshold: 3,        // Open after 3 failures
      recoveryTimeout: 30000,     // 30 second recovery timeout
      monitoringPeriod: 120000,   // 2 minute monitoring window
      halfOpenMaxCalls: 2         // Allow 2 calls in half-open state
    });
  }

  /**
   * Predefined circuit breaker for external API calls with balanced settings.
   * 
   * Uses moderate settings suitable for external API calls:
   * - Higher failure threshold (5) to account for network variability
   * - Longer recovery timeout (60s) for external service recovery
   * - More half-open calls (3) for better recovery testing
   * 
   * @template T - The return type of the API operation
   * @param service - Name of the external service for circuit identification
   * @param operation - The API operation to execute
   * @returns The result of the API operation
   * 
   * @example
   * ```typescript
   * const paymentResult = await this.circuitBreaker.executeExternalApi('payment-service', async () => {
   *   return await this.paymentApi.processPayment(paymentData);
   * });
   * ```
   */
  async executeExternalApi<T>(service: string, operation: () => Promise<T>): Promise<T> {
    return this.execute(`external_api:${service}`, operation, {
      failureThreshold: 5,        // Open after 5 failures
      recoveryTimeout: 60000,     // 1 minute recovery timeout
      monitoringPeriod: 300000,   // 5 minute monitoring window
      halfOpenMaxCalls: 3         // Allow 3 calls in half-open state
    });
  }

  /**
   * Predefined circuit breaker for AI service operations with conservative settings.
   * 
   * Uses conservative settings suitable for AI services:
   * - Lower failure threshold (3) due to cost and complexity
   * - Shorter recovery timeout (30s) for faster recovery
   * - Limited half-open calls (2) to avoid overwhelming AI services
   * 
   * @template T - The return type of the AI operation
   * @param operation - The AI service operation to execute
   * @returns The result of the AI operation
   * 
   * @example
   * ```typescript
   * const embedding = await this.circuitBreaker.executeAiService(async () => {
   *   return await this.openai.embeddings.create({
   *     model: 'text-embedding-3-large',
   *     input: text
   *   });
   * });
   * ```
   */
  async executeAiService<T>(operation: () => Promise<T>): Promise<T> {
    return this.execute("ai_service", operation, {
      failureThreshold: 3,        // Open after 3 failures
      recoveryTimeout: 30000,     // 30 second recovery timeout
      monitoringPeriod: 180000,   // 3 minute monitoring window
      halfOpenMaxCalls: 2         // Allow 2 calls in half-open state
    });
  }

  /**
   * Predefined circuit breaker for file storage operations with balanced settings.
   * 
   * Uses moderate settings suitable for file storage operations:
   * - Higher failure threshold (5) to account for storage variability
   * - Medium recovery timeout (45s) for storage service recovery
   * - More half-open calls (3) for better recovery testing
   * 
   * @template T - The return type of the storage operation
   * @param operation - The file storage operation to execute
   * @returns The result of the storage operation
   * 
   * @example
   * ```typescript
   * const uploadResult = await this.circuitBreaker.executeFileStorage(async () => {
   *   return await this.s3.upload({
   *     Bucket: 'my-bucket',
   *     Key: 'file.pdf',
   *     Body: fileBuffer
   *   }).promise();
   * });
   * ```
   */
  async executeFileStorage<T>(operation: () => Promise<T>): Promise<T> {
    return this.execute("file_storage", operation, {
      failureThreshold: 5,        // Open after 5 failures
      recoveryTimeout: 45000,     // 45 second recovery timeout
      monitoringPeriod: 240000,   // 4 minute monitoring window
      halfOpenMaxCalls: 3         // Allow 3 calls in half-open state
    });
  }
}
