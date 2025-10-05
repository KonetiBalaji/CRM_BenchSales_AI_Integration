/**
 * @fileoverview Audit Module
 * 
 * This module provides audit logging and compliance tracking functionality for the CRM BenchSales AI Integration application.
 * It offers comprehensive audit capabilities with cryptographic chain of custody, ensuring data integrity
 * and regulatory compliance for audit trails and security monitoring.
 * 
 * The module provides:
 * - Immutable audit log creation with cryptographic hashing
 * - Automatic request/response logging via interceptors
 * - Sensitive data redaction and sanitization
 * - Chain of custody verification
 * - Compliance-ready audit trail generation
 * - Tenant-scoped audit isolation
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Module } from "@nestjs/common";

import { AuditService } from "./audit.service";

/**
 * Module for audit logging and compliance tracking.
 * 
 * This module provides comprehensive audit capabilities for the CRM system,
 * including automatic request/response logging, sensitive data protection,
 * and cryptographic chain of custody for regulatory compliance.
 * 
 * The module includes:
 * - AuditService: Core service for recording audit events
 * - AuditInterceptor: Automatic HTTP request/response logging (used globally)
 * 
 * @example
 * ```typescript
 * // Import the module in your application
 * @Module({
 *   imports: [AuditModule],
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
 *   constructor(private readonly audit: AuditService) {}
 *   
 *   async performAction(tenantId: string, userId: string) {
 *     try {
 *       // Perform some action
 *       await this.audit.record({
 *         tenantId,
 *         userId,
 *         action: "PERFORM_ACTION",
 *         entityType: "custom",
 *         resultCode: "SUCCESS"
 *       });
 *     } catch (error) {
 *       await this.audit.record({
 *         tenantId,
 *         userId,
 *         action: "PERFORM_ACTION",
 *         entityType: "custom",
 *         resultCode: "ERROR",
 *         payload: { error: error.message }
 *       });
 *       throw error;
 *     }
 *   }
 * }
 * ```
 */
@Module({
  providers: [AuditService],
  exports: [AuditService]
})
export class AuditModule {}

