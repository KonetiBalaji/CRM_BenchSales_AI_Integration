/**
 * @fileoverview Custom Reports Controller
 * 
 * This controller provides custom reporting endpoints for the CRM BenchSales AI Integration application.
 * It handles report creation, data visualization, and export capabilities.
 * 
 * Key features:
 * - Drag-and-drop report builder
 * - Custom data filters and grouping
 * - Multiple export formats (PDF, Excel, CSV)
 * - Scheduled report delivery
 * - Report templates and sharing
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
import { CustomReportsService } from "./custom-reports.service";

/**
 * Controller for custom reporting functionality.
 * 
 * This controller provides endpoints for creating, managing, and executing
 * custom reports with advanced filtering and visualization capabilities.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Create a new report
 * POST /tenants/{tenantId}/custom-reports
 * {
 *   "name": "Q1 Performance Report",
 *   "dataSource": "consultants",
 *   "filters": { "dateRange": "2024-01-01 to 2024-03-31" }
 * }
 * 
 * // Generate report data
 * GET /tenants/{tenantId}/custom-reports/{reportId}/data
 * ```
 */
@Controller("tenants/:tenantId/custom-reports")
export class CustomReportsController {
  /**
   * Initializes the custom reports controller with the service dependency.
   * 
   * @param service - The custom reports service for business logic
   */
  constructor(private readonly service: CustomReportsService) {}

  /**
   * Creates a new custom report with specified configuration.
   * 
   * This endpoint creates a new report with data source, filters,
   * grouping, and visualization settings.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing report configuration
   * @param body.name - Report name
   * @param body.dataSource - Data source (consultants, requirements, submissions, etc.)
   * @param body.filters - Data filters and criteria
   * @param body.grouping - Data grouping configuration
   * @param body.visualization - Chart and visualization settings
   * @returns Object containing report details and configuration
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "name": "Q1 Performance Report",
   *   "dataSource": "consultants",
   *   "filters": {
   *     "dateRange": "2024-01-01 to 2024-03-31",
   *     "status": ["ACTIVE", "AVAILABLE"]
   *   },
   *   "grouping": {
   *     "by": ["location", "skills"],
   *     "aggregations": ["count", "avg_rate"]
   *   },
   *   "visualization": {
   *     "type": "bar_chart",
   *     "xAxis": "location",
   *     "yAxis": "count"
   *   }
   * }
   * 
   * // Response format
   * {
   *   "reportId": "report-456",
   *   "name": "Q1 Performance Report",
   *   "status": "CREATED",
   *   "dataSource": "consultants",
   *   "createdAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  createReport(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      name: string; 
      dataSource: string; 
      filters: Record<string, any>; 
      grouping: Record<string, any>; 
      visualization: Record<string, any> 
    }
  ) {
    return this.service.createReport(tenantId, body.name, body.dataSource, body.filters, body.grouping, body.visualization);
  }

  /**
   * Retrieves all custom reports for the tenant.
   * 
   * This endpoint provides a list of all custom reports with their
   * configuration, status, and metadata.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering and pagination
   * @param query.dataSource - Filter by data source
   * @param query.status - Filter by report status
   * @param query.limit - Maximum number of reports to return
   * @param query.offset - Number of reports to skip
   * @returns Array of custom reports with pagination info
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "reportId": "report-456",
   *     "name": "Q1 Performance Report",
   *     "dataSource": "consultants",
   *     "status": "ACTIVE",
   *     "lastRun": "2024-01-15T10:00:00Z",
   *     "createdAt": "2024-01-15T09:00:00Z"
   *   }
   * ]
   * ```
   */
  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getReports(
    @Param("tenantId") tenantId: string,
    @Query("dataSource") dataSource?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.service.getReports(tenantId, dataSource, status, limit, offset);
  }

  /**
   * Retrieves detailed information about a specific report.
   * 
   * This endpoint provides comprehensive details about a report
   * including configuration, filters, and visualization settings.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param reportId - The report identifier
   * @returns Object containing detailed report information
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "reportId": "report-456",
   *   "name": "Q1 Performance Report",
   *   "dataSource": "consultants",
   *   "filters": {
   *     "dateRange": "2024-01-01 to 2024-03-31",
   *     "status": ["ACTIVE", "AVAILABLE"]
   *   },
   *   "grouping": {
   *     "by": ["location", "skills"],
   *     "aggregations": ["count", "avg_rate"]
   *   },
   *   "visualization": {
   *     "type": "bar_chart",
   *     "xAxis": "location",
   *     "yAxis": "count"
   *   },
   *   "status": "ACTIVE",
   *   "lastRun": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Get(":reportId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getReport(@Param("tenantId") tenantId: string, @Param("reportId") reportId: string) {
    return this.service.getReport(tenantId, reportId);
  }

  /**
   * Updates an existing custom report.
   * 
   * This endpoint allows modification of report configuration including
   * filters, grouping, and visualization settings.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param reportId - The report identifier
   * @param body - Request body containing updated report configuration
   * @returns Object containing updated report details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "name": "Updated Q1 Performance Report",
   *   "filters": {
   *     "dateRange": "2024-01-01 to 2024-03-31",
   *     "status": ["ACTIVE", "AVAILABLE", "INTERVIEWING"]
   *   }
   * }
   * ```
   */
  @Put(":reportId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  updateReport(
    @Param("tenantId") tenantId: string,
    @Param("reportId") reportId: string,
    @Body() body: { name?: string; filters?: Record<string, any>; grouping?: Record<string, any>; visualization?: Record<string, any> }
  ) {
    return this.service.updateReport(tenantId, reportId, body);
  }

  /**
   * Generates report data based on the report configuration.
   * 
   * This endpoint executes the report query and returns the data
   * in the specified format with applied filters and grouping.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param reportId - The report identifier
   * @param query - Query parameters for data generation
   * @param query.format - Data format (json, csv, excel)
   * @param query.includeMetadata - Whether to include metadata
   * @returns Object containing report data and metadata
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "data": [
   *     {
   *       "location": "Remote",
   *       "skill": "React",
   *       "count": 25,
   *       "avg_rate": 95.50
   *     }
   *   ],
   *   "metadata": {
   *     "totalRecords": 25,
   *     "generatedAt": "2024-01-15T10:00:00Z",
   *     "executionTime": "1.2 seconds"
   *   }
   * }
   * ```
   */
  @Get(":reportId/data")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  generateReportData(
    @Param("tenantId") tenantId: string,
    @Param("reportId") reportId: string,
    @Query("format") format?: string,
    @Query("includeMetadata") includeMetadata?: string
  ) {
    return this.service.generateReportData(tenantId, reportId, format, includeMetadata);
  }

  /**
   * Exports report data in the specified format.
   * 
   * This endpoint generates and downloads report data in various formats
   * including PDF, Excel, and CSV with proper formatting.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param reportId - The report identifier
   * @param query - Query parameters for export
   * @param query.format - Export format (pdf, excel, csv)
   * @param query.includeCharts - Whether to include charts in export
   * @returns File download response with exported data
   * 
   * @example
   * ```typescript
   * // Response: File download with appropriate headers
   * Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   * Content-Disposition: attachment; filename="Q1_Performance_Report.xlsx"
   * ```
   */
  @Get(":reportId/export")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  exportReport(
    @Param("tenantId") tenantId: string,
    @Param("reportId") reportId: string,
    @Query("format") format?: string,
    @Query("includeCharts") includeCharts?: string
  ) {
    return this.service.exportReport(tenantId, reportId, format, includeCharts);
  }

  /**
   * Schedules automatic report generation and delivery.
   * 
   * This endpoint sets up scheduled report generation with email delivery
   * to specified recipients at regular intervals.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param reportId - The report identifier
   * @param body - Request body containing schedule configuration
   * @param body.schedule - Schedule configuration (daily, weekly, monthly)
   * @param body.recipients - Email addresses for report delivery
   * @param body.format - Export format for scheduled reports
   * @returns Object containing schedule confirmation and details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "schedule": {
   *     "frequency": "weekly",
   *     "dayOfWeek": "monday",
   *     "time": "09:00"
   *   },
   *   "recipients": ["manager@company.com", "team@company.com"],
   *   "format": "pdf"
   * }
   * 
   * // Response format
   * {
   *   "scheduleId": "schedule-789",
   *   "status": "ACTIVE",
   *   "nextRun": "2024-01-22T09:00:00Z",
   *   "recipients": ["manager@company.com", "team@company.com"]
   * }
   * ```
   */
  @Post(":reportId/schedule")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  scheduleReport(
    @Param("tenantId") tenantId: string,
    @Param("reportId") reportId: string,
    @Body() body: { 
      schedule: { frequency: string; dayOfWeek?: string; time: string }; 
      recipients: string[]; 
      format: string 
    }
  ) {
    return this.service.scheduleReport(tenantId, reportId, body.schedule, body.recipients, body.format);
  }
}
