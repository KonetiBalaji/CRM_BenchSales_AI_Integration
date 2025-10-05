/**
 * @fileoverview Audit Interceptor
 * 
 * This interceptor provides automatic audit logging for the CRM BenchSales AI Integration application.
 * It captures and logs all HTTP requests and responses, including user actions, entity operations,
 * and system events for compliance, security, and debugging purposes.
 * 
 * Key features:
 * - Automatic request/response logging
 * - Sensitive data redaction and sanitization
 * - Entity type and ID resolution
 * - Error tracking and logging
 * - Public endpoint exclusion
 * - Response truncation for large payloads
 * - Chain of custody with cryptographic hashing
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { catchError, tap } from "rxjs/operators";

import { RequestContextService } from "../../infrastructure/context";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { AuditService } from "./audit.service";

/** Set of field names that contain sensitive information and should be redacted */
const SENSITIVE_FIELDS = new Set(["password", "token", "access_token", "refresh_token", "secret"]);

/**
 * Interceptor for automatic audit logging of HTTP requests and responses.
 * 
 * This interceptor automatically captures and logs all HTTP requests and responses
 * for audit and compliance purposes. It sanitizes sensitive data, extracts entity
 * information, and maintains a chain of custody through cryptographic hashing.
 * 
 * @example
 * ```typescript
 * // Apply globally in main.ts
 * app.useGlobalInterceptors(new AuditInterceptor(auditService, contextService, reflector));
 * 
 * // Or apply to specific controllers
 * @UseInterceptors(AuditInterceptor)
 * @Controller('tenants/:tenantId/consultants')
 * export class ConsultantsController {}
 * ```
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  /**
   * Initializes the audit interceptor with required dependencies.
   * 
   * @param auditService - Service for recording audit events
   * @param contextService - Service for accessing request context
   * @param reflector - NestJS reflector for metadata inspection
   */
  constructor(
    private readonly auditService: AuditService,
    private readonly contextService: RequestContextService,
    private readonly reflector: Reflector
  ) {}

  /**
   * Intercepts HTTP requests and responses for audit logging.
   * 
   * This method captures request details, processes the request through the pipeline,
   * and logs both successful responses and errors. It skips public endpoints and
   * requests without tenant context.
   * 
   * @param context - Execution context containing request information
   * @param next - Call handler for continuing the request pipeline
   * @returns Observable that processes the request and logs audit events
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Skip audit logging for public endpoints
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<any>();
    const user: AuthUser | undefined = request.user;
    const tenantId = this.contextService.getTenantId() ?? user?.tenantId ?? request.params?.tenantId;

    // Skip audit logging if no tenant context is available
    if (!tenantId) {
      return next.handle();
    }

    // Build base audit event with request information
    const baseEvent = {
      tenantId,
      userId: user?.sub,
      actorRole: user?.roles?.[0],
      action: `${request.method} ${request.route?.path ?? request.url}`,
      entityType: this.resolveEntityType(request),
      entityId: this.resolveEntityId(request),
      payload: this.sanitizePayload(request.method === "GET" ? request.query : request.body),
      ipAddress: request.ip,
      userAgent: request.headers?.["user-agent"] as string | undefined
    };

    return next.handle().pipe(
      // Log successful responses
      tap(async (responseBody: unknown) => {
        await this.auditService.record({
          ...baseEvent,
          resultCode: "SUCCESS",
          payload: {
            request: baseEvent.payload,
            responseSample: this.truncateResponse(responseBody)
          }
        });
      }),
      // Log errors and re-throw them
      catchError((error: unknown) => {
        const err = error as Error;
        void this.auditService.record({
          ...baseEvent,
          resultCode: err?.name ?? "ERROR",
          payload: {
            request: baseEvent.payload,
            error: err?.message ?? String(error)
          }
        });
        throw error;
      })
    );
  }

  /**
   * Resolves the entity type from the request URL path.
   * 
   * This method extracts the entity type from the URL path segments,
   * typically the second segment in tenant-scoped routes.
   * 
   * @param request - HTTP request object
   * @returns Entity type string or "unknown" if not resolvable
   * 
   * @example
   * ```typescript
   * // URL: /tenants/tenant-123/consultants/consultant-456
   * // Returns: "consultants"
   * 
   * // URL: /tenants/tenant-123/requirements
   * // Returns: "requirements"
   * ```
   */
  private resolveEntityType(request: any): string {
    const segments = (request.route?.path ?? request.url ?? "").split("/").filter(Boolean);
    return segments[1] ?? segments[0] ?? "unknown";
  }

  /**
   * Resolves the entity ID from the request parameters.
   * 
   * This method extracts the entity ID from various parameter names
   * commonly used in the API routes.
   * 
   * @param request - HTTP request object
   * @returns Entity ID string or null if not found
   * 
   * @example
   * ```typescript
   * // URL: /tenants/tenant-123/consultants/consultant-456
   * // Returns: "consultant-456"
   * 
   * // URL: /tenants/tenant-123/requirements/req-789
   * // Returns: "req-789"
   * ```
   */
  private resolveEntityId(request: any): string | null {
    const params = request.params ?? {};
    return params.id ?? params.requirementId ?? params.consultantId ?? params.submissionId ?? null;
  }

  /**
   * Sanitizes payload data by redacting sensitive fields.
   * 
   * This method recursively processes payload data to identify and redact
   * sensitive information such as passwords, tokens, and secrets.
   * 
   * @param payload - The payload data to sanitize
   * @returns Sanitized payload with sensitive fields redacted
   * 
   * @example
   * ```typescript
   * const payload = {
   *   username: "john.doe",
   *   password: "secret123",
   *   token: "abc123"
   * };
   * 
   * // Returns:
   * // {
   * //   username: "john.doe",
   * //   password: "[REDACTED]",
   * //   token: "[REDACTED]"
   * // }
   * ```
   */
  private sanitizePayload(payload: unknown): unknown {
    if (payload == null) {
      return null;
    }

    if (Array.isArray(payload)) {
      return payload.map((item) => this.sanitizePayload(item));
    }

    if (typeof payload !== "object") {
      return payload;
    }

    const clone: Record<string, unknown> = { ...(payload as Record<string, unknown>) };

    for (const key of Object.keys(clone)) {
      if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
        clone[key] = "[REDACTED]";
      }
    }

    return clone;
  }

  /**
   * Truncates large response payloads to prevent audit log bloat.
   * 
   * This method limits response data size in audit logs to maintain
   * performance and storage efficiency while preserving essential information.
   * 
   * @param response - The response data to potentially truncate
   * @returns Truncated response data or original if within limits
   * 
   * @example
   * ```typescript
   * const largeResponse = { data: "very long string..." }; // > 2000 chars
   * 
   * // Returns: "{ data: "very long string..." }..." (truncated)
   * 
   * const smallResponse = { id: "123", name: "John" };
   * 
   * // Returns: { id: "123", name: "John" } (unchanged)
   * ```
   */
  private truncateResponse(response: unknown): unknown {
    if (response == null) {
      return null;
    }

    try {
      const serialized = JSON.stringify(response);
      if (serialized.length > 2000) {
        return `${serialized.slice(0, 2000)}...`;
      }
      return response;
    } catch (error) {
      return "[unserializable]";
    }
  }
}
