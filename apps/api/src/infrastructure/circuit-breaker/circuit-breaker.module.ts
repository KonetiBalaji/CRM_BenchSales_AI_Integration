/**
 * @fileoverview Circuit Breaker Module
 * 
 * This module provides circuit breaker functionality for the CRM BenchSales AI Integration application.
 * It implements the circuit breaker pattern to prevent cascading failures and improve system resilience
 * by monitoring service calls and temporarily stopping calls to failing services.
 * 
 * The circuit breaker service supports:
 * - Automatic failure detection and circuit state management
 * - Configurable failure thresholds and recovery timeouts
 * - Half-open state for gradual service recovery testing
 * - Predefined circuit breakers for common services (database, APIs, AI services)
 * - State persistence using Redis cache
 * - Comprehensive monitoring and statistics
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { CacheModule } from "../cache/cache.module";
import { CircuitBreakerService } from "./circuit-breaker.service";

/**
 * Global circuit breaker module that provides fault tolerance and resilience services.
 * 
 * This module implements the circuit breaker pattern to protect the application from
 * cascading failures when external services or dependencies become unavailable or
 * start failing. It monitors service calls and automatically opens circuits when
 * failure rates exceed configured thresholds.
 * 
 * The module depends on:
 * - ConfigModule: For accessing circuit breaker configuration
 * - CacheModule: For persisting circuit breaker state in Redis
 * 
 * @example
 * ```typescript
 * // In any service
 * constructor(private readonly circuitBreaker: CircuitBreakerService) {}
 * 
 * async callExternalApi() {
 *   return this.circuitBreaker.executeExternalApi('my-service', async () => {
 *     return await this.httpService.get('https://api.example.com/data').toPromise();
 *   });
 * }
 * ```
 */
@Global()
@Module({
  imports: [ConfigModule, CacheModule],
  providers: [CircuitBreakerService],
  exports: [CircuitBreakerService]
})
export class CircuitBreakerModule {}
