/**
 * @fileoverview Audit Service
 * 
 * This service provides audit logging functionality for the CRM BenchSales AI Integration application.
 * It records and stores audit events with cryptographic chain of custody, ensuring data integrity
 * and compliance with regulatory requirements for audit trails.
 * 
 * Key features:
 * - Immutable audit log creation
 * - Cryptographic chain of custody with SHA-256 hashing
 * - Transactional consistency for data integrity
 * - Comprehensive event metadata capture
 * - Tenant-scoped audit isolation
 * - Compliance-ready audit trail generation
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Injectable } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { createHash } from "crypto";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";

/**
 * Interface defining the input structure for audit events.
 * 
 * This interface contains all the information needed to create a comprehensive
 * audit log entry, including user context, action details, and system metadata.
 * 
 * @example
 * ```typescript
 * const auditEvent: AuditEventInput = {
 *   tenantId: "tenant-123",
 *   userId: "user-456",
 *   actorRole: "ADMIN",
 *   action: "POST /tenants/tenant-123/consultants",
 *   entityType: "consultants",
 *   entityId: "consultant-789",
 *   payload: { name: "John Doe", skills: ["React", "Node.js"] },
 *   resultCode: "SUCCESS",
 *   ipAddress: "192.168.1.100",
 *   userAgent: "Mozilla/5.0..."
 * };
 * ```
 */
export interface AuditEventInput {
  /** Tenant identifier for multi-tenant data isolation */
  tenantId: string;
  /** User identifier who performed the action (optional) */
  userId?: string;
  /** Role of the user who performed the action (optional) */
  actorRole?: string;
  /** Description of the action performed (e.g., "POST /api/consultants") */
  action: string;
  /** Type of entity affected by the action (e.g., "consultants", "requirements") */
  entityType: string;
  /** Specific entity ID affected by the action (optional) */
  entityId?: string | null;
  /** Additional payload data related to the action (optional) */
  payload?: unknown;
  /** Result code indicating success or failure (e.g., "SUCCESS", "ERROR") */
  resultCode: string;
  /** IP address of the client making the request (optional) */
  ipAddress?: string;
  /** User agent string from the client request (optional) */
  userAgent?: string;
}

/**
 * Service for audit logging and compliance tracking.
 * 
 * This service provides comprehensive audit logging capabilities with cryptographic
 * chain of custody to ensure data integrity and regulatory compliance. It creates
 * immutable audit trails that can be used for security analysis and compliance reporting.
 * 
 * @example
 * ```typescript
 * // Record an audit event
 * await this.auditService.record({
 *   tenantId: "tenant-123",
 *   userId: "user-456",
 *   action: "CREATE_CONSULTANT",
 *   entityType: "consultants",
 *   entityId: "consultant-789",
 *   resultCode: "SUCCESS",
 *   payload: { name: "John Doe" }
 * });
 * ```
 */
@Injectable()
export class AuditService {
  /**
   * Initializes the audit service with the Prisma database service.
   * 
   * @param prisma - Prisma service for database operations
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an audit event with cryptographic chain of custody.
   * 
   * This method creates an immutable audit log entry with a cryptographic hash
   * that links to the previous audit entry, ensuring chain of custody and
   * data integrity. The operation is performed within a database transaction
   * to maintain consistency.
   * 
   * @param event - The audit event to record
   * @returns Promise that resolves when the audit event is recorded
   * 
   * @example
   * ```typescript
   * await this.auditService.record({
   *   tenantId: "tenant-123",
   *   userId: "user-456",
   *   actorRole: "ADMIN",
   *   action: "POST /tenants/tenant-123/consultants",
   *   entityType: "consultants",
   *   entityId: "consultant-789",
   *   payload: { name: "John Doe", skills: ["React", "Node.js"] },
   *   resultCode: "SUCCESS",
   *   ipAddress: "192.168.1.100",
   *   userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
   * });
   * ```
   */
  async record(event: AuditEventInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Get the most recent audit log entry for this tenant to maintain chain of custody
      const previous = await tx.auditLog.findFirst({
        where: { tenantId: event.tenantId },
        orderBy: { createdAt: "desc" }
      });

      // Use the previous hash or null for the first entry
      const prevHash = previous?.hash ?? null;
      
      // Compute cryptographic hash for this audit entry
      const hash = this.computeHash({
        prevHash,
        tenantId: event.tenantId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        payload: event.payload,
        resultCode: event.resultCode,
        timestamp: new Date().toISOString()
      });

      // Create the audit log entry
      await tx.auditLog.create({
        data: {
          tenant: { connect: { id: event.tenantId } },
          actorRole: (event.actorRole as UserRole | undefined),
          action: event.action,
          entityType: event.entityType,
          entityId: event.entityId ?? "",
          payload: event.payload as Prisma.InputJsonValue,
          resultCode: event.resultCode,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          prevHash,
          hash
        }
      });
    });
  }

  /**
   * Computes a SHA-256 hash for audit event data.
   * 
   * This method creates a cryptographic hash of the audit event data to ensure
   * data integrity and provide chain of custody verification. The hash includes
   * all relevant event data and a timestamp for uniqueness.
   * 
   * @param payload - The data to hash
   * @returns SHA-256 hash as a hexadecimal string
   * 
   * @example
   * ```typescript
   * const hash = this.computeHash({
   *   prevHash: "abc123...",
   *   tenantId: "tenant-123",
   *   action: "CREATE_CONSULTANT",
   *   timestamp: "2024-01-15T10:30:00.000Z"
   * });
   * // Returns: "def456..." (SHA-256 hash)
   * ```
   */
  private computeHash(payload: Record<string, unknown>): string {
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }
}
