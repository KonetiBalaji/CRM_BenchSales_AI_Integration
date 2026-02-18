/**
 * @fileoverview Vendor Onboarding Controller
 * 
 * This controller provides vendor onboarding endpoints for the CRM BenchSales AI Integration application.
 * It handles vendor registration, compliance verification, and onboarding workflows.
 * 
 * Key features:
 * - Vendor registration and verification
 * - Compliance and legal document management
 * - Vendor qualification process
 * - Onboarding workflow automation
 * - Vendor portal integration
 * - Role-based access control for different user types
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { VendorOnboardingService } from "./vendor-onboarding.service";

/**
 * Controller for vendor onboarding functionality.
 * 
 * This controller provides endpoints for managing vendor onboarding processes,
 * compliance verification, and qualification workflows with comprehensive
 * document management and approval processes.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Register new vendor
 * POST /tenants/{tenantId}/vendors/onboarding
 * {
 *   "companyName": "Tech Solutions Inc",
 *   "contactEmail": "contact@techsolutions.com",
 *   "businessType": "IT Services"
 * }
 * 
 * // Submit vendor documents
 * POST /tenants/{tenantId}/vendors/{vendorId}/documents
 * {
 *   "documentType": "business_license",
 *   "fileUrl": "https://storage.com/license.pdf"
 * }
 * ```
 */
@Controller("tenants/:tenantId/vendors")
export class VendorOnboardingController {
  /**
   * Initializes the vendor onboarding controller with the service dependency.
   * 
   * @param service - The vendor onboarding service for business logic
   */
  constructor(private readonly service: VendorOnboardingService) {}

  /**
   * Initiates vendor onboarding process.
   * 
   * This endpoint starts the vendor onboarding workflow with
   * registration, compliance checks, and qualification process.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing vendor details
   * @param body.companyName - Vendor company name
   * @param body.contactEmail - Primary contact email
   * @param body.contactPhone - Primary contact phone
   * @param body.businessType - Type of business (IT Services, Consulting, etc.)
   * @param body.companySize - Company size category
   * @param body.website - Company website URL
   * @param body.address - Company address information
   * @param body.taxId - Tax identification number
   * @returns Object containing onboarding process details and status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "companyName": "Tech Solutions Inc",
   *   "contactEmail": "contact@techsolutions.com",
   *   "contactPhone": "+1-555-0123",
   *   "businessType": "IT Services",
   *   "companySize": "50-200 employees",
   *   "website": "https://techsolutions.com",
   *   "address": {
   *     "street": "123 Tech Street",
   *     "city": "San Francisco",
   *     "state": "CA",
   *     "zipCode": "94105",
   *     "country": "USA"
   *   },
   *   "taxId": "12-3456789"
   * }
   * 
   * // Response format
   * {
   *   "vendorId": "vendor-789",
   *   "onboardingId": "onboard-456",
   *   "companyName": "Tech Solutions Inc",
   *   "status": "REGISTERED",
   *   "workflowId": "workflow-123",
   *   "estimatedCompletion": "2024-02-15",
   *   "createdAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post("onboarding")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  initiateVendorOnboarding(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      companyName: string; 
      contactEmail: string; 
      contactPhone: string; 
      businessType: string; 
      companySize: string; 
      website: string; 
      address: { street: string; city: string; state: string; zipCode: string; country: string }; 
      taxId: string 
    }
  ) {
    return this.service.initiateVendorOnboarding(tenantId, body.companyName, body.contactEmail, body.contactPhone, body.businessType, body.companySize, body.website, body.address, body.taxId);
  }

  /**
   * Retrieves all vendor onboarding processes for the tenant.
   * 
   * This endpoint provides a list of all vendor onboarding processes with their
   * status, progress, and completion information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering and pagination
   * @param query.status - Onboarding status filter
   * @param query.businessType - Filter by business type
   * @param query.companySize - Filter by company size
   * @param query.limit - Maximum number of onboarding processes to return
   * @param query.offset - Number of onboarding processes to skip
   * @returns Array of vendor onboarding processes with pagination info
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "vendorId": "vendor-789",
   *     "companyName": "Tech Solutions Inc",
   *     "businessType": "IT Services",
   *     "companySize": "50-200 employees",
   *     "status": "IN_PROGRESS",
   *     "progress": 0.65,
   *     "createdAt": "2024-01-15T10:00:00Z",
   *     "estimatedCompletion": "2024-02-15"
   *   }
   * ]
   * ```
   */
  @Get("onboarding")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getVendorOnboardingProcesses(
    @Param("tenantId") tenantId: string,
    @Query("status") status?: string,
    @Query("businessType") businessType?: string,
    @Query("companySize") companySize?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.service.getVendorOnboardingProcesses(tenantId, status, businessType, companySize, limit, offset);
  }

  /**
   * Retrieves detailed information about a specific vendor onboarding process.
   * 
   * This endpoint provides comprehensive details about a vendor onboarding process
   * including progress, documents, compliance status, and workflow information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param onboardingId - The onboarding process identifier
   * @returns Object containing detailed vendor onboarding process information
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "onboardingId": "onboard-456",
   *   "vendor": {
   *     "id": "vendor-789",
   *     "companyName": "Tech Solutions Inc",
   *     "contactEmail": "contact@techsolutions.com",
   *     "businessType": "IT Services"
   *   },
   *   "workflow": {
   *     "id": "workflow-123",
   *     "name": "Standard Vendor Onboarding",
   *     "estimatedDuration": "30 days"
   *   },
   *   "progress": {
   *     "overall": 0.65,
   *     "completedSteps": 13,
   *     "totalSteps": 20,
   *     "estimatedCompletion": "2024-02-15"
   *   },
   *   "compliance": {
   *     "status": "IN_PROGRESS",
   *     "requiredDocuments": 8,
   *     "submittedDocuments": 5,
   *     "verifiedDocuments": 3
   *   },
   *   "documents": [
   *     {
   *       "documentId": "doc-1",
   *       "type": "business_license",
   *       "status": "VERIFIED",
   *       "submittedAt": "2024-01-16T09:00:00Z"
   *     }
   *   ]
   * }
   * ```
   */
  @Get("onboarding/:onboardingId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getVendorOnboardingProcess(@Param("tenantId") tenantId: string, @Param("onboardingId") onboardingId: string) {
    return this.service.getVendorOnboardingProcess(tenantId, onboardingId);
  }

  /**
   * Submits vendor documents for verification.
   * 
   * This endpoint handles document uploads with automatic verification,
   * compliance checks, and integration with document management systems.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param vendorId - The vendor identifier
   * @param body - Request body containing document details
   * @param body.documentType - Type of document being submitted
   * @param body.documentName - Name of the document
   * @param body.fileUrl - URL or reference to the uploaded file
   * @param body.expirationDate - Document expiration date if applicable
   * @param body.notes - Optional notes for the document
   * @returns Object containing document submission confirmation
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "documentType": "business_license",
   *   "documentName": "Business_License_TechSolutions.pdf",
   *   "fileUrl": "https://storage.company.com/documents/license_123.pdf",
   *   "expirationDate": "2025-12-31",
   *   "notes": "Valid business license for IT services"
   * }
   * 
   * // Response format
   * {
   *   "documentId": "doc-456",
   *   "documentType": "business_license",
   *   "status": "SUBMITTED",
   *   "verificationStatus": "PENDING",
   *   "submittedAt": "2024-01-16T09:00:00Z",
   *   "estimatedVerificationTime": "2-3 business days"
   * }
   * ```
   */
  @Post(":vendorId/documents")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  submitVendorDocument(
    @Param("tenantId") tenantId: string,
    @Param("vendorId") vendorId: string,
    @Body() body: { documentType: string; documentName: string; fileUrl: string; expirationDate?: string; notes?: string }
  ) {
    return this.service.submitVendorDocument(tenantId, vendorId, body.documentType, body.documentName, body.fileUrl, body.expirationDate, body.notes);
  }

  /**
   * Updates vendor onboarding step status.
   * 
   * This endpoint allows updating the status of specific onboarding steps
   * with automatic progress calculation and workflow advancement.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param onboardingId - The onboarding process identifier
   * @param stepId - The step identifier
   * @param body - Request body containing step update details
   * @param body.status - New step status
   * @param body.notes - Optional notes for the step update
   * @param body.completedBy - ID of the person completing the step
   * @returns Object containing updated step information
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "status": "COMPLETED",
   *   "notes": "All compliance requirements verified",
   *   "completedBy": "compliance-admin-1"
   * }
   * 
   * // Response format
   * {
   *   "stepId": "step-1",
   *   "status": "COMPLETED",
   *   "completedAt": "2024-01-18T14:30:00Z",
   *   "completedBy": "compliance-admin-1",
   *   "notes": "All compliance requirements verified",
   *   "updatedProgress": 0.70
   * }
   * ```
   */
  @Put("onboarding/:onboardingId/steps/:stepId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  updateOnboardingStep(
    @Param("tenantId") tenantId: string,
    @Param("onboardingId") onboardingId: string,
    @Param("stepId") stepId: string,
    @Body() body: { status: string; notes?: string; completedBy: string }
  ) {
    return this.service.updateOnboardingStep(tenantId, onboardingId, stepId, body.status, body.notes, body.completedBy);
  }

  /**
   * Approves or rejects vendor onboarding.
   * 
   * This endpoint handles final approval or rejection of vendor onboarding
   * with proper notification and status updates.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param onboardingId - The onboarding process identifier
   * @param body - Request body containing approval details
   * @param body.decision - Decision (approve, reject, request_more_info)
   * @param body.reason - Reason for the decision
   * @param body.approvedBy - ID of the person making the decision
   * @param body.conditions - Any conditions for approval
   * @returns Object containing approval decision and details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "decision": "approve",
   *   "reason": "All requirements met, vendor qualified",
   *   "approvedBy": "vendor-manager-1",
   *   "conditions": ["Maintain current certifications", "Submit quarterly reports"]
   * }
   * 
   * // Response format
   * {
   *   "onboardingId": "onboard-456",
   *   "decision": "approve",
   *   "status": "APPROVED",
   *   "reason": "All requirements met, vendor qualified",
   *   "approvedBy": "vendor-manager-1",
   *   "conditions": ["Maintain current certifications", "Submit quarterly reports"],
   *   "approvedAt": "2024-01-25T16:00:00Z"
   * }
   * ```
   */
  @Post("onboarding/:onboardingId/approval")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  approveVendorOnboarding(
    @Param("tenantId") tenantId: string,
    @Param("onboardingId") onboardingId: string,
    @Body() body: { decision: string; reason: string; approvedBy: string; conditions?: string[] }
  ) {
    return this.service.approveVendorOnboarding(tenantId, onboardingId, body.decision, body.reason, body.approvedBy, body.conditions);
  }

  /**
   * Retrieves vendor onboarding analytics and metrics.
   * 
   * This endpoint provides comprehensive analytics including
   * onboarding completion rates, average duration, and bottleneck analysis.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for analytics
   * @param query.period - Time period for analytics (7d, 30d, 90d)
   * @param query.businessType - Filter by business type
   * @param query.includeBottlenecks - Whether to include bottleneck analysis
   * @returns Object containing vendor onboarding analytics and metrics
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "totalOnboardings": 25,
   *     "completedOnboardings": 20,
   *     "avgCompletionTime": "28 days",
   *     "approvalRate": 0.80
   *   },
   *   "byBusinessType": [
   *     {
   *       "businessType": "IT Services",
   *       "total": 15,
   *       "completed": 12,
   *       "avgTime": "25 days",
   *       "approvalRate": 0.85
   *     }
   *   ],
   *   "bottlenecks": [
   *     {
   *       "step": "Compliance Verification",
   *       "avgDelay": "5 days",
   *       "impact": "High",
   *       "recommendation": "Automate compliance checks"
   *     }
   *   ]
   * }
   * ```
   */
  @Get("onboarding/analytics")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getVendorOnboardingAnalytics(
    @Param("tenantId") tenantId: string,
    @Query("period") period?: string,
    @Query("businessType") businessType?: string,
    @Query("includeBottlenecks") includeBottlenecks?: string
  ) {
    return this.service.getVendorOnboardingAnalytics(tenantId, period, businessType, includeBottlenecks);
  }

  /**
   * Sends reminder notifications for pending onboarding steps.
   * 
   * This endpoint sends automated reminders to vendors for pending
   * onboarding steps and document submissions.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param onboardingId - The onboarding process identifier
   * @param body - Request body containing reminder details
   * @param body.reminderType - Type of reminder (document_submission, step_completion)
   * @param body.message - Custom reminder message
   * @param body.sendToVendor - Whether to send to vendor
   * @param body.sendToInternal - Whether to send to internal team
   * @returns Object containing reminder confirmation and details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "reminderType": "document_submission",
   *   "message": "Please submit your business license document to continue onboarding",
   *   "sendToVendor": true,
   *   "sendToInternal": false
   * }
   * 
   * // Response format
   * {
   *   "reminderId": "reminder-789",
   *   "onboardingId": "onboard-456",
   *   "reminderType": "document_submission",
   *   "sentToVendor": true,
   *   "sentToInternal": false,
   *   "sentAt": "2024-01-20T10:00:00Z"
   * }
   * ```
   */
  @Post("onboarding/:onboardingId/reminders")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  sendOnboardingReminder(
    @Param("tenantId") tenantId: string,
    @Param("onboardingId") onboardingId: string,
    @Body() body: { reminderType: string; message: string; sendToVendor: boolean; sendToInternal: boolean }
  ) {
    return this.service.sendOnboardingReminder(tenantId, onboardingId, body.reminderType, body.message, body.sendToVendor, body.sendToInternal);
  }
}
