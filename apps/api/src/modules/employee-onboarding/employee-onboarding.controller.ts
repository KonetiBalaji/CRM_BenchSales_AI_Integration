/**
 * @fileoverview Employee Onboarding Controller
 * 
 * This controller provides employee onboarding endpoints for the CRM BenchSales AI Integration application.
 * It handles onboarding workflows, document management, and progress tracking capabilities.
 * 
 * Key features:
 * - Automated onboarding workflows
 * - Document collection and verification
 * - Progress tracking and notifications
 * - Compliance and legal requirements
 * - Integration with HR systems
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
import { EmployeeOnboardingService } from "./employee-onboarding.service";

/**
 * Controller for employee onboarding functionality.
 * 
 * This controller provides endpoints for managing employee onboarding processes,
 * document collection, and workflow automation with comprehensive
 * progress tracking and compliance management.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Start onboarding process
 * POST /tenants/{tenantId}/onboarding/employees
 * {
 *   "employeeId": "emp-123",
 *   "position": "Senior Developer",
 *   "startDate": "2024-02-01"
 * }
 * 
 * // Get onboarding progress
 * GET /tenants/{tenantId}/onboarding/employees/{employeeId}/progress
 * ```
 */
@Controller("tenants/:tenantId/onboarding")
export class EmployeeOnboardingController {
  /**
   * Initializes the employee onboarding controller with the service dependency.
   * 
   * @param service - The employee onboarding service for business logic
   */
  constructor(private readonly service: EmployeeOnboardingService) {}

  /**
   * Initiates the onboarding process for a new employee.
   * 
   * This endpoint starts the automated onboarding workflow with
   * document collection, compliance checks, and progress tracking.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing onboarding details
   * @param body.employeeId - The employee identifier
   * @param body.position - Employee position/title
   * @param body.startDate - Employee start date
   * @param body.department - Employee department
   * @param body.managerId - Manager/team lead ID
   * @param body.workLocation - Work location (office, remote, hybrid)
   * @param body.contractType - Contract type (full-time, part-time, contract)
   * @returns Object containing onboarding process details and status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "employeeId": "emp-123",
   *   "position": "Senior React Developer",
   *   "startDate": "2024-02-01",
   *   "department": "Engineering",
   *   "managerId": "mgr-456",
   *   "workLocation": "Remote",
   *   "contractType": "full-time"
   * }
   * 
   * // Response format
   * {
   *   "onboardingId": "onboard-789",
   *   "employeeId": "emp-123",
   *   "status": "IN_PROGRESS",
   *   "workflowId": "workflow-101",
   *   "estimatedCompletion": "2024-02-15",
   *   "startedAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post("employees")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  startOnboarding(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      employeeId: string; 
      position: string; 
      startDate: string; 
      department: string; 
      managerId: string; 
      workLocation: string; 
      contractType: string 
    }
  ) {
    return this.service.startOnboarding(tenantId, body.employeeId, body.position, body.startDate, body.department, body.managerId, body.workLocation, body.contractType);
  }

  /**
   * Retrieves all onboarding processes for the tenant.
   * 
   * This endpoint provides a list of all onboarding processes with their
   * status, progress, and completion information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering and pagination
   * @param query.status - Onboarding status filter
   * @param query.department - Filter by department
   * @param query.contractType - Filter by contract type
   * @param query.limit - Maximum number of onboarding processes to return
   * @param query.offset - Number of onboarding processes to skip
   * @returns Array of onboarding processes with pagination info
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "onboardingId": "onboard-789",
   *     "employeeName": "John Doe",
   *     "position": "Senior React Developer",
   *     "department": "Engineering",
   *     "status": "IN_PROGRESS",
   *     "progress": 0.65,
   *     "startDate": "2024-02-01",
   *     "startedAt": "2024-01-15T10:00:00Z"
   *   }
   * ]
   * ```
   */
  @Get("employees")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getOnboardingProcesses(
    @Param("tenantId") tenantId: string,
    @Query("status") status?: string,
    @Query("department") department?: string,
    @Query("contractType") contractType?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.service.getOnboardingProcesses(tenantId, status, department, contractType, limit, offset);
  }

  /**
   * Retrieves detailed information about a specific onboarding process.
   * 
   * This endpoint provides comprehensive details about an onboarding process
   * including progress, tasks, documents, and timeline information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param onboardingId - The onboarding process identifier
   * @returns Object containing detailed onboarding process information
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "onboardingId": "onboard-789",
   *   "employee": {
   *     "id": "emp-123",
   *     "name": "John Doe",
   *     "email": "john.doe@company.com",
   *     "position": "Senior React Developer"
   *   },
   *   "workflow": {
   *     "id": "workflow-101",
   *     "name": "Standard Engineering Onboarding",
   *     "estimatedDuration": "14 days"
   *   },
   *   "progress": {
   *     "overall": 0.65,
   *     "completedTasks": 13,
   *     "totalTasks": 20,
   *     "estimatedCompletion": "2024-02-15"
   *   },
   *   "tasks": [
   *     {
   *       "taskId": "task-1",
   *       "name": "Complete I-9 Form",
   *       "status": "COMPLETED",
   *       "dueDate": "2024-01-20",
       *       "completedAt": "2024-01-18T14:30:00Z"
   *     }
   *   ],
   *   "documents": [
   *     {
   *       "documentId": "doc-1",
   *       "name": "Employment Contract",
   *       "status": "SIGNED",
   *       "uploadedAt": "2024-01-16T09:00:00Z"
   *     }
   *   ]
   * }
   * ```
   */
  @Get("employees/:onboardingId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getOnboardingProcess(@Param("tenantId") tenantId: string, @Param("onboardingId") onboardingId: string) {
    return this.service.getOnboardingProcess(tenantId, onboardingId);
  }

  /**
   * Updates an onboarding task status.
   * 
   * This endpoint allows updating the status of specific onboarding tasks
   * with automatic progress calculation and workflow advancement.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param onboardingId - The onboarding process identifier
   * @param taskId - The task identifier
   * @param body - Request body containing task update details
   * @param body.status - New task status
   * @param body.notes - Optional notes for the task update
   * @param body.completedBy - ID of the person completing the task
   * @returns Object containing updated task information
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "status": "COMPLETED",
   *   "notes": "All required documents submitted and verified",
   *   "completedBy": "hr-admin-1"
   * }
   * 
   * // Response format
   * {
   *   "taskId": "task-1",
   *   "status": "COMPLETED",
   *   "completedAt": "2024-01-18T14:30:00Z",
   *   "completedBy": "hr-admin-1",
   *   "notes": "All required documents submitted and verified",
   *   "updatedProgress": 0.70
   * }
   * ```
   */
  @Put("employees/:onboardingId/tasks/:taskId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  updateTaskStatus(
    @Param("tenantId") tenantId: string,
    @Param("onboardingId") onboardingId: string,
    @Param("taskId") taskId: string,
    @Body() body: { status: string; notes?: string; completedBy: string }
  ) {
    return this.service.updateTaskStatus(tenantId, onboardingId, taskId, body.status, body.notes, body.completedBy);
  }

  /**
   * Uploads and processes onboarding documents.
   * 
   * This endpoint handles document uploads with automatic verification,
   * compliance checks, and integration with document management systems.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param onboardingId - The onboarding process identifier
   * @param body - Request body containing document details
   * @param body.documentType - Type of document being uploaded
   * @param body.documentName - Name of the document
   * @param body.fileUrl - URL or reference to the uploaded file
   * @param body.verificationRequired - Whether verification is required
   * @returns Object containing document processing confirmation
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "documentType": "employment_contract",
   *   "documentName": "Employment_Contract_John_Doe.pdf",
   *   "fileUrl": "https://storage.company.com/documents/contract_123.pdf",
   *   "verificationRequired": true
   * }
   * 
   * // Response format
   * {
   *   "documentId": "doc-456",
   *   "documentType": "employment_contract",
   *   "status": "UPLOADED",
   *   "verificationStatus": "PENDING",
   *   "uploadedAt": "2024-01-16T09:00:00Z",
   *   "processedAt": "2024-01-16T09:05:00Z"
   * }
   * ```
   */
  @Post("employees/:onboardingId/documents")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  uploadDocument(
    @Param("tenantId") tenantId: string,
    @Param("onboardingId") onboardingId: string,
    @Body() body: { documentType: string; documentName: string; fileUrl: string; verificationRequired: boolean }
  ) {
    return this.service.uploadDocument(tenantId, onboardingId, body.documentType, body.documentName, body.fileUrl, body.verificationRequired);
  }

  /**
   * Retrieves onboarding analytics and metrics.
   * 
   * This endpoint provides comprehensive analytics including
   * completion rates, average duration, and bottleneck analysis.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for analytics
   * @param query.period - Time period for analytics (7d, 30d, 90d)
   * @param query.department - Filter by department
   * @param query.includeBottlenecks - Whether to include bottleneck analysis
   * @returns Object containing onboarding analytics and metrics
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "totalOnboardings": 45,
   *     "completedOnboardings": 38,
   *     "avgCompletionTime": "12 days",
   *     "completionRate": 0.84
   *   },
   *   "byDepartment": [
   *     {
   *       "department": "Engineering",
   *       "total": 20,
   *       "completed": 18,
   *       "avgTime": "10 days",
   *       "completionRate": 0.90
   *     }
   *   ],
   *   "bottlenecks": [
   *     {
   *       "task": "Background Check",
   *       "avgDelay": "3 days",
   *       "impact": "High",
   *       "recommendation": "Consider pre-employment screening"
   *     }
   *   ]
   * }
   * ```
   */
  @Get("analytics")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getOnboardingAnalytics(
    @Param("tenantId") tenantId: string,
    @Query("period") period?: string,
    @Query("department") department?: string,
    @Query("includeBottlenecks") includeBottlenecks?: string
  ) {
    return this.service.getOnboardingAnalytics(tenantId, period, department, includeBottlenecks);
  }

  /**
   * Completes the onboarding process for an employee.
   * 
   * This endpoint finalizes the onboarding process with final checks,
   * notifications, and integration with HR systems.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param onboardingId - The onboarding process identifier
   * @param body - Request body containing completion details
   * @param body.completedBy - ID of the person completing the process
   * @param body.finalNotes - Final notes or comments
   * @param body.notifyEmployee - Whether to notify the employee
   * @returns Object containing completion confirmation and details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "completedBy": "hr-admin-1",
   *   "finalNotes": "All requirements completed successfully",
   *   "notifyEmployee": true
   * }
   * 
   * // Response format
   * {
   *   "onboardingId": "onboard-789",
   *   "status": "COMPLETED",
   *   "completedAt": "2024-01-25T16:00:00Z",
   *   "completedBy": "hr-admin-1",
   *   "finalNotes": "All requirements completed successfully",
   *   "employeeNotified": true,
   *   "totalDuration": "10 days"
   * }
   * ```
   */
  @Post("employees/:onboardingId/complete")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  completeOnboarding(
    @Param("tenantId") tenantId: string,
    @Param("onboardingId") onboardingId: string,
    @Body() body: { completedBy: string; finalNotes?: string; notifyEmployee: boolean }
  ) {
    return this.service.completeOnboarding(tenantId, onboardingId, body.completedBy, body.finalNotes, body.notifyEmployee);
  }
}
