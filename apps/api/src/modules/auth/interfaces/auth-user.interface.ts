/**
 * @fileoverview Authentication User Interface
 * 
 * This interface defines the structure of an authenticated user in the CRM BenchSales AI Integration application.
 * It represents the user information extracted from JWT tokens and used throughout the application
 * for authorization, audit logging, and user context management.
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

/**
 * Interface representing an authenticated user in the system.
 * 
 * This interface defines the structure of user information extracted from JWT tokens
 * and used throughout the application for authorization, audit logging, and user context.
 * It includes both required fields for system functionality and optional fields for
 * user profile information.
 * 
 * @example
 * ```typescript
 * const user: AuthUser = {
 *   sub: "auth0|507f1f77bcf86cd799439011",
 *   tenantId: "tenant-123",
 *   roles: ["ADMIN", "MANAGER"],
 *   email: "john.doe@example.com",
 *   name: "John Doe",
 *   picture: "https://example.com/avatar.jpg"
 * };
 * 
 * // Access user information in controllers
 * @Controller('profile')
 * export class ProfileController {
 *   @Get()
 *   async getProfile(@Request() req: { user: AuthUser }) {
 *     const { sub, tenantId, roles, email, name } = req.user;
 *     return { userId: sub, tenantId, roles, email, name };
 *   }
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Use in services for authorization checks
 * @Injectable()
 * export class SomeService {
 *   canUserAccess(user: AuthUser, resource: string): boolean {
 *     if (user.roles.includes('ADMIN')) {
 *       return true; // Admins can access everything
 *     }
 *     
 *     if (resource === 'consultants' && user.roles.includes('MANAGER')) {
 *       return true; // Managers can access consultants
 *     }
 *     
 *     return false;
 *   }
 * }
 * ```
 */
export interface AuthUser {
  /** 
   * Unique subject identifier from the JWT token (typically the user ID)
   * This is the primary identifier for the user in the system
   */
  sub: string;
  
  /** 
   * Tenant identifier for multi-tenant data isolation
   * Determines which tenant's data the user can access
   */
  tenantId: string;
  
  /** 
   * Array of user roles for authorization
   * Used by the RolesGuard to determine access permissions
   */
  roles: string[];
  
  /** 
   * User's email address (optional)
   * Extracted from JWT token if available
   */
  email?: string;
  
  /** 
   * User's display name (optional)
   * Extracted from JWT token if available
   */
  name?: string;
  
  /** 
   * URL to user's profile picture (optional)
   * Extracted from JWT token if available
   */
  picture?: string;
}
