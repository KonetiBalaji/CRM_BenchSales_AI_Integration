/**
 * @fileoverview Vendor Contract Management Controller
 * 
 * This controller provides vendor contract management endpoints for the CRM BenchSales AI Integration application.
 * It handles contract creation, negotiation, and lifecycle management.
 * 
 * Key features:
 * - Contract creation and templates
 * - Contract negotiation workflow
 * - Contract lifecycle management
 * - Compliance and legal tracking
 * - Renewal and termination management
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
import { VendorContractManagementService } from "./vendor-contract-management.service";

/**
 * Controller for vendor contract management functionality.
 * 
 * This controller provides endpoints for managing vendor contracts,
 * negotiations, and lifecycle management with comprehensive
 * compliance tracking and legal management.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Create vendor contract
 * POST /tenants/{tenantId}/vendor-contracts
 * {
 *   "vendorId": "vendor-123",
 *   "contractType": "service_agreement",
 *   "startDate": "2024-01-01",
 *   "endDate": "2024-12-31"
 * }
 * 
 * // Submit contract for approval
 * POST /tenants/{tenantId}/vendor-contracts/{contractId}/approval
 * {
   *   "submittedBy": "mgr-456",
   *   "approvalLevel": "legal_review"
   * }
 * ```
 */
@Controller("tenants/:tenantId/vendor-contracts")
export class VendorContractManagementController {
  /**
   * Initializes the vendor contract management controller with the service dependency.
   * 
   * @param service - The vendor contract management service for business logic
   */
  constructor(private readonly service: VendorContractManagementService) {}

  /**
   * Creates a new vendor contract.
   * 
   * This endpoint creates a comprehensive vendor contract with
   * terms, conditions, and legal requirements.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing contract details
   * @param body.vendorId - The vendor identifier
   * @param body.contractType - Type of contract (service_agreement, msa, sow)
   * @param body.startDate - Contract start date
   * @param body.endDate - Contract end date
   * @param body.contractValue - Total contract value
   * @param body.currency - Currency for contract value
   * @param body.terms - Contract terms and conditions
   * @param body.sla - Service level agreements
   * @param body.paymentTerms - Payment terms and schedule
   * @returns Object containing contract details and status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "vendorId": "vendor-123",
   *   "contractType": "service_agreement",
   *   "startDate": "2024-01-01",
   *   "endDate": "2024-12-31",
   *   "contractValue": 500000,
   *   "currency": "USD",
   *   "terms": {
   *     "scope": "IT Services and Support",
   *     "deliverables": ["Software Development", "Technical Support"],
   *     "governance": "Monthly review meetings"
   *   },
   *   "sla": {
   *     "responseTime": "4 hours",
   *     "resolutionTime": "24 hours",
   *     "uptime": "99.9%"
   *   },
   *   "paymentTerms": {
   *     "schedule": "Monthly",
   *     "terms": "Net 30",
   *     "currency": "USD"
   *   }
   * }
   * 
   * // Response format
   * {
   *   "contractId": "contract-789",
   *   "vendorId": "vendor-123",
   *   "contractType": "service_agreement",
   *   "status": "DRAFT",
   *   "contractValue": 500000,
   *   "currency": "USD",
   *   "startDate": "2024-01-01",
   *   "endDate": "2024-12-31",
   *   "createdAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  createVendorContract(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      vendorId: string; 
      contractType: string; 
      startDate: string; 
      endDate: string; 
      contractValue: number; 
      currency: string; 
      terms: { scope: string; deliverables: string[]; governance: string }; 
      sla: { responseTime: string; resolutionTime: string; uptime: string }; 
      paymentTerms: { schedule: string; terms: string; currency: string } 
    }
  ) {
    return this.service.createVendorContract(tenantId, body.vendorId, body.contractType, body.startDate, body.endDate, body.contractValue, body.currency, body.terms, body.sla, body.paymentTerms);
  }

  /**
   * Retrieves all vendor contracts for the tenant.
   * 
   * This endpoint provides a list of all vendor contracts with their
   * status, value, and key information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering and pagination
   * @param query.status - Contract status filter
   * @param query.vendorId - Filter by vendor ID
   * @param query.contractType - Filter by contract type
   * @param query.limit - Maximum number of contracts to return
   * @param query.offset - Number of contracts to skip
   * @returns Array of vendor contracts with pagination info
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "contractId": "contract-789",
   *     "vendorName": "Tech Solutions Inc",
   *     "contractType": "service_agreement",
   *     "status": "ACTIVE",
   *     "contractValue": 500000,
   *     "currency": "USD",
   *     "startDate": "2024-01-01",
   *     "endDate": "2024-12-31",
   *     "daysToExpiry": 45
   *   }
   * ]
   * ```
   */
  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getVendorContracts(
    @Param("tenantId") tenantId: string,
    @Query("status") status?: string,
    @Query("vendorId") vendorId?: string,
    @Query("contractType") contractType?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.service.getVendorContracts(tenantId, status, vendorId, contractType, limit, offset);
  }

  /**
   * Retrieves detailed information about a specific vendor contract.
   * 
   * This endpoint provides comprehensive details about a vendor contract
   * including terms, SLA, payment terms, and compliance status.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param contractId - The contract identifier
   * @returns Object containing detailed contract information
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "contractId": "contract-789",
   *   "vendor": {
   *     "id": "vendor-123",
   *     "name": "Tech Solutions Inc",
   *     "contactEmail": "contact@techsolutions.com"
   *   },
   *   "contractType": "service_agreement",
   *   "status": "ACTIVE",
   *   "contractValue": 500000,
   *   "currency": "USD",
   *   "startDate": "2024-01-01",
   *   "endDate": "2024-12-31",
   *   "terms": {
   *     "scope": "IT Services and Support",
   *     "deliverables": ["Software Development", "Technical Support"],
   *     "governance": "Monthly review meetings"
   *   },
   *   "sla": {
   *     "responseTime": "4 hours",
   *     "resolutionTime": "24 hours",
   *     "uptime": "99.9%"
   *   },
   *   "paymentTerms": {
   *     "schedule": "Monthly",
   *     "terms": "Net 30",
   *     "currency": "USD"
   *   },
   *   "compliance": {
   *     "status": "COMPLIANT",
   *     "lastReview": "2024-01-15T10:00:00Z",
   *     "nextReview": "2024-04-15T10:00:00Z"
   *   }
   * }
   * ```
   */
  @Get(":contractId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getVendorContract(@Param("tenantId") tenantId: string, @Param("contractId") contractId: string) {
    return this.service.getVendorContract(tenantId, contractId);
  }

  /**
   * Updates an existing vendor contract.
   * 
   * This endpoint allows modification of contract terms, conditions,
   * and other details with proper version control.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param contractId - The contract identifier
   * @param body - Request body containing contract updates
   * @param body.terms - Updated contract terms
   * @param body.sla - Updated SLA requirements
   * @param body.paymentTerms - Updated payment terms
   * @param body.contractValue - Updated contract value
   * @param body.endDate - Updated end date
   * @returns Object containing updated contract information
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "terms": {
   *     "scope": "Updated IT Services and Support",
   *     "deliverables": ["Software Development", "Technical Support", "Cloud Migration"],
   *     "governance": "Bi-weekly review meetings"
   *   },
   *   "contractValue": 600000,
   *   "endDate": "2025-12-31"
   * }
   * ```
   */
  @Put(":contractId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  updateVendorContract(
    @Param("tenantId") tenantId: string,
    @Param("contractId") contractId: string,
    @Body() body: { 
      terms?: { scope: string; deliverables: string[]; governance: string }; 
      sla?: { responseTime: string; resolutionTime: string; uptime: string }; 
      paymentTerms?: { schedule: string; terms: string; currency: string }; 
      contractValue?: number; 
      endDate?: string 
    }
  ) {
    return this.service.updateVendorContract(tenantId, contractId, body);
  }

  /**
   * Submits a contract for approval.
   * 
   * This endpoint initiates the contract approval workflow with
   * legal review, compliance checks, and stakeholder approval.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param contractId - The contract identifier
   * @param body - Request body containing approval details
   * @param body.submittedBy - ID of the person submitting for approval
   * @param body.approvalLevel - Required approval level
   * @param body.notes - Optional notes for submission
   * @returns Object containing approval submission confirmation
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "submittedBy": "mgr-456",
   *   "approvalLevel": "legal_review",
   *   "notes": "Contract ready for legal review and approval"
   * }
   * 
   * // Response format
   * {
   *   "contractId": "contract-789",
   *   "status": "PENDING_APPROVAL",
   *   "approvalLevel": "legal_review",
   *   "submittedBy": "mgr-456",
   *   "submittedAt": "2024-01-15T14:30:00Z",
   *   "estimatedApprovalTime": "5-7 business days"
   * }
   * ```
   */
  @Post(":contractId/approval")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  submitContractForApproval(
    @Param("tenantId") tenantId: string,
    @Param("contractId") contractId: string,
    @Body() body: { submittedBy: string; approvalLevel: string; notes?: string }
  ) {
    return this.service.submitContractForApproval(tenantId, contractId, body.submittedBy, body.approvalLevel, body.notes);
  }

  /**
   * Approves or rejects a vendor contract.
   * 
   * This endpoint handles contract approval or rejection with
   * proper documentation and status updates.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param contractId - The contract identifier
   * @param body - Request body containing approval decision
   * @param body.decision - Decision (approve, reject, request_changes)
   * @param body.approvedBy - ID of the person making the decision
   * @param body.reason - Reason for the decision
   * @param body.conditions - Any conditions for approval
   * @returns Object containing approval decision and details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "decision": "approve",
   *   "approvedBy": "legal-admin-1",
   *   "reason": "Contract terms are acceptable and compliant",
   *   "conditions": ["Vendor must maintain current certifications"]
   * }
   * 
   * // Response format
   * {
   *   "contractId": "contract-789",
   *   "decision": "approve",
   *   "status": "APPROVED",
   *   "approvedBy": "legal-admin-1",
   *   "reason": "Contract terms are acceptable and compliant",
   *   "conditions": ["Vendor must maintain current certifications"],
   *   "approvedAt": "2024-01-20T16:00:00Z"
   * }
   * ```
   */
  @Post(":contractId/approval/decision")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  approveContract(
    @Param("tenantId") tenantId: string,
    @Param("contractId") contractId: string,
    @Body() body: { decision: string; approvedBy: string; reason: string; conditions?: string[] }
  ) {
    return this.service.approveContract(tenantId, contractId, body.decision, body.approvedBy, body.reason, body.conditions);
  }

  /**
   * Initiates contract renewal process.
   * 
   * This endpoint starts the contract renewal workflow with
   * automatic notifications and renewal terms negotiation.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param contractId - The contract identifier
   * @param body - Request body containing renewal details
   * @param body.renewalType - Type of renewal (automatic, manual, renegotiation)
   * @param body.newEndDate - New end date for renewal
   * @param body.renewalTerms - Updated terms for renewal
   * @param body.initiatedBy - ID of the person initiating renewal
   * @returns Object containing renewal process details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "renewalType": "renegotiation",
   *   "newEndDate": "2025-12-31",
   *   "renewalTerms": {
   *     "contractValue": 550000,
   *     "updatedSLA": {
   *       "responseTime": "2 hours",
   *       "resolutionTime": "16 hours"
   *     }
   *   },
   *   "initiatedBy": "mgr-456"
   * }
   * 
   * // Response format
   * {
   *   "renewalId": "renewal-101",
   *   "contractId": "contract-789",
   *   "renewalType": "renegotiation",
   *   "status": "IN_PROGRESS",
   *   "newEndDate": "2025-12-31",
   *   "initiatedBy": "mgr-456",
   *   "initiatedAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post(":contractId/renewal")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  initiateContractRenewal(
    @Param("tenantId") tenantId: string,
    @Param("contractId") contractId: string,
    @Body() body: { 
      renewalType: string; 
      newEndDate: string; 
      renewalTerms: { contractValue?: number; updatedSLA?: { responseTime: string; resolutionTime: string } }; 
      initiatedBy: string 
    }
  ) {
    return this.service.initiateContractRenewal(tenantId, contractId, body.renewalType, body.newEndDate, body.renewalTerms, body.initiatedBy);
  }

  /**
   * Terminates a vendor contract.
   * 
   * This endpoint handles contract termination with proper
   * documentation, notice periods, and transition planning.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param contractId - The contract identifier
   * @param body - Request body containing termination details
   * @param body.terminationReason - Reason for termination
   * @param body.terminationType - Type of termination (mutual, breach, convenience)
   * @param body.effectiveDate - Effective date of termination
   * @param body.noticePeriod - Notice period in days
   * @param body.terminatedBy - ID of the person terminating the contract
   * @returns Object containing termination confirmation and details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "terminationReason": "Service quality issues",
   *   "terminationType": "breach",
   *   "effectiveDate": "2024-03-01",
   *   "noticePeriod": 30,
   *   "terminatedBy": "mgr-456"
   * }
   * 
   * // Response format
   * {
   *   "contractId": "contract-789",
   *   "status": "TERMINATED",
   *   "terminationReason": "Service quality issues",
   *   "terminationType": "breach",
   *   "effectiveDate": "2024-03-01",
   *   "terminatedBy": "mgr-456",
   *   "terminatedAt": "2024-01-15T16:00:00Z"
   * }
   * ```
   */
  @Post(":contractId/termination")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  terminateContract(
    @Param("tenantId") tenantId: string,
    @Param("contractId") contractId: string,
    @Body() body: { 
      terminationReason: string; 
      terminationType: string; 
      effectiveDate: string; 
      noticePeriod: number; 
      terminatedBy: string 
    }
  ) {
    return this.service.terminateContract(tenantId, contractId, body.terminationReason, body.terminationType, body.effectiveDate, body.noticePeriod, body.terminatedBy);
  }

  /**
   * Retrieves contract analytics and metrics.
   * 
   * This endpoint provides comprehensive analytics including
   * contract value trends, renewal rates, and compliance metrics.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for analytics
   * @param query.period - Time period for analytics (7d, 30d, 90d, 1y)
   * @param query.contractType - Filter by contract type
   * @param query.includeTrends - Whether to include trend analysis
   * @returns Object containing contract analytics and metrics
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "totalContracts": 45,
   *     "activeContracts": 38,
   *     "totalValue": 2500000,
   *     "avgContractValue": 55556
   *   },
   *   "byStatus": [
   *     {
   *       "status": "ACTIVE",
   *       "count": 38,
   *       "totalValue": 2000000
   *     }
   *   ],
   *   "byType": [
   *     {
   *       "contractType": "service_agreement",
   *       "count": 25,
   *       "avgValue": 60000
   *     }
   *   ],
   *   "renewalMetrics": {
   *     "renewalRate": 0.85,
   *     "avgRenewalTime": "45 days",
   *     "upcomingRenewals": 8
   *   }
   * }
   * ```
   */
  @Get("analytics")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getContractAnalytics(
    @Param("tenantId") tenantId: string,
    @Query("period") period?: string,
    @Query("contractType") contractType?: string,
    @Query("includeTrends") includeTrends?: string
  ) {
    return this.service.getContractAnalytics(tenantId, period, contractType, includeTrends);
  }
}
