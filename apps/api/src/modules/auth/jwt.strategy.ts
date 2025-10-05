/**
 * @fileoverview JWT Strategy
 * 
 * This strategy handles JWT token validation and user extraction for the CRM BenchSales AI Integration application.
 * It integrates with Auth0 for JWT validation using JWKS (JSON Web Key Set) and extracts user information
 * including roles and tenant context from JWT claims.
 * 
 * Key features:
 * - Auth0 JWT validation with JWKS integration
 * - Custom claim extraction for roles and tenant
 * - Configurable claim names and validation settings
 * - Support for multiple role formats (array, comma-separated, scope)
 * - Clock tolerance for token validation
 * - Caching for JWKS keys
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { passportJwtSecret } from "jwks-rsa";

import { AuthUser } from "./interfaces/auth-user.interface";

/**
 * Interface defining the structure of JWT payload claims.
 * 
 * This interface represents the expected structure of JWT token payloads,
 * including standard claims and custom claims for roles and tenant information.
 */
interface JwtPayload {
  /** Subject identifier (user ID) */
  sub: string;
  /** User's email address (optional) */
  email?: string;
  /** User's display name (optional) */
  name?: string;
  /** URL to user's profile picture (optional) */
  picture?: string;
  /** OAuth scope (optional, used as fallback for roles) */
  scope?: string;
  /** Additional custom claims */
  [key: string]: unknown;
}

/**
 * JWT authentication strategy for validating tokens and extracting user information.
 * 
 * This strategy validates JWT tokens using Auth0's JWKS endpoint and extracts
 * user information including roles and tenant context. It supports configurable
 * claim names and various role formats for flexibility.
 * 
 * @example
 * ```typescript
 * // The strategy is automatically used by Passport when configured
 * // in the AuthModule. No direct usage is required.
 * 
 * // Configuration example in app.config.ts:
 * auth: {
 *   audience: "https://api.benchcrm.ai",
 *   issuer: "https://your-domain.auth0.com/",
 *   rolesClaim: "https://benchcrm.ai/roles",
 *   tenantClaim: "https://benchcrm.ai/tenant",
 *   clockTolerance: 60
 * }
 * ```
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /** Custom claim name for user roles */
  private readonly rolesClaim: string;
  /** Custom claim name for tenant identifier */
  private readonly tenantClaim: string;

  /**
   * Initializes the JWT strategy with configuration from the config service.
   * 
   * @param configService - NestJS configuration service for accessing auth settings
   */
  constructor(private readonly configService: ConfigService) {
    const auth = configService.get<{
      audience?: string;
      issuer?: string;
      jwksUri?: string;
      rolesClaim?: string;
      tenantClaim?: string;
      clockTolerance?: number;
    }>("auth") ?? {};

    const issuer = auth.issuer;
    const jwksUri = auth.jwksUri ?? (issuer ? `${issuer}.well-known/jwks.json` : undefined);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: auth.audience,
      issuer,
      algorithms: ["RS256"],
      clockTolerance: auth.clockTolerance ?? 60,
      secretOrKeyProvider: jwksUri
        ? passportJwtSecret({
            cache: true,
            cacheMaxEntries: 5,
            cacheMaxAge: 600000,
            jwksRequestsPerMinute: 10,
            jwksUri
          })
        : undefined
    });

    this.rolesClaim = auth.rolesClaim ?? "https://benchcrm.ai/roles";
    this.tenantClaim = auth.tenantClaim ?? "https://benchcrm.ai/tenant";
  }

  /**
   * Validates JWT payload and extracts user information.
   * 
   * This method is called by Passport after JWT validation succeeds. It extracts
   * user information from the JWT payload and returns an AuthUser object that
   * will be attached to the request.
   * 
   * @param payload - The validated JWT payload
   * @returns AuthUser object with extracted user information
   * @throws UnauthorizedException if required claims are missing
   * 
   * @example
   * ```typescript
   * // JWT payload example:
   * {
   *   "sub": "auth0|507f1f77bcf86cd799439011",
   *   "email": "john.doe@example.com",
   *   "name": "John Doe",
   *   "picture": "https://example.com/avatar.jpg",
   *   "https://benchcrm.ai/roles": ["ADMIN", "MANAGER"],
   *   "https://benchcrm.ai/tenant": "tenant-123"
   * }
   * 
   * // Returns:
   * {
   *   sub: "auth0|507f1f77bcf86cd799439011",
   *   tenantId: "tenant-123",
   *   roles: ["ADMIN", "MANAGER"],
   *   email: "john.doe@example.com",
   *   name: "John Doe",
   *   picture: "https://example.com/avatar.jpg"
   * }
   * ```
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException("Missing subject in JWT");
    }

    const tenantId = this.getTenantId(payload);
    if (!tenantId) {
      throw new UnauthorizedException("Missing tenant claim");
    }

    return {
      sub: payload.sub,
      tenantId,
      roles: this.getRoles(payload),
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
      picture: typeof payload.picture === "string" ? payload.picture : undefined
    };
  }

  /**
   * Extracts tenant ID from JWT payload.
   * 
   * This method looks for the tenant claim in the JWT payload using the
   * configured claim name.
   * 
   * @param payload - The JWT payload
   * @returns Tenant ID string or undefined if not found
   */
  private getTenantId(payload: JwtPayload): string | undefined {
    const claim = payload[this.tenantClaim];
    return typeof claim === "string" && claim.length > 0 ? claim : undefined;
  }

  /**
   * Extracts user roles from JWT payload.
   * 
   * This method supports multiple role formats:
   * - Array of role strings
   * - Comma-separated role string
   * - OAuth scope as fallback
   * 
   * @param payload - The JWT payload
   * @returns Array of role strings
   */
  private getRoles(payload: JwtPayload): string[] {
    const claim = payload[this.rolesClaim];
    if (Array.isArray(claim)) {
      return claim.filter((role): role is string => typeof role === "string");
    }
    if (typeof claim === "string") {
      return claim.split(",").map((role) => role.trim()).filter(Boolean);
    }
    const scope = payload.scope;
    if (typeof scope === "string") {
      return scope.split(" ").filter(Boolean);
    }
    return [];
  }
}

