/**
 * @fileoverview Data Visualization Controller
 * 
 * This controller provides data visualization endpoints for the CRM BenchSales AI Integration application.
 * It handles dashboard creation, chart generation, and interactive reporting capabilities.
 * 
 * Key features:
 * - Interactive dashboard creation
 * - Chart and graph generation
 * - Real-time data visualization
 * - Custom report builders
 * - Data export capabilities
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
import { DataVisualizationService } from "./data-visualization.service";

/**
 * Controller for data visualization functionality.
 * 
 * This controller provides endpoints for managing interactive dashboards,
 * chart generation, and data visualization with comprehensive
 * reporting and export capabilities.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Create dashboard
 * POST /tenants/{tenantId}/visualization/dashboards
 * {
 *   "name": "Sales Performance Dashboard",
 *   "description": "Real-time sales metrics and KPIs"
 * }
 * 
 * // Generate chart
 * POST /tenants/{tenantId}/visualization/charts
 * {
 *   "type": "line",
 *   "dataSource": "sales_metrics",
 *   "config": {...}
 * }
 * ```
 */
@Controller("tenants/:tenantId/visualization")
export class DataVisualizationController {
  /**
   * Initializes the data visualization controller with the service dependency.
   * 
   * @param service - The data visualization service for business logic
   */
  constructor(private readonly service: DataVisualizationService) {}

  /**
   * Creates a new interactive dashboard.
   * 
   * This endpoint creates a comprehensive dashboard with
   * customizable widgets, charts, and real-time data feeds.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing dashboard details
   * @param body.name - Dashboard name
   * @param body.description - Dashboard description
   * @param body.category - Dashboard category (sales, hr, finance, operations)
   * @param body.layout - Dashboard layout configuration
   * @param body.widgets - Array of dashboard widgets
   * @param body.refreshInterval - Data refresh interval in seconds
   * @param body.isPublic - Whether dashboard is publicly accessible
   * @returns Object containing dashboard details and status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "name": "Sales Performance Dashboard",
   *   "description": "Real-time sales metrics and KPIs for executive overview",
   *   "category": "sales",
   *   "layout": {
   *     "columns": 3,
   *     "rows": 2,
   *     "gridSize": "medium"
   *   },
   *   "widgets": [
   *     {
   *       "type": "kpi",
   *       "title": "Total Revenue",
   *       "dataSource": "revenue_metrics",
   *       "position": { "x": 0, "y": 0, "width": 1, "height": 1 }
   *     }
   *   ],
   *   "refreshInterval": 300,
   *   "isPublic": false
   * }
   * 
   * // Response format
   * {
   *   "dashboardId": "dashboard-789",
   *   "name": "Sales Performance Dashboard",
   *   "category": "sales",
   *   "status": "ACTIVE",
   *   "widgetCount": 1,
   *   "createdAt": "2024-01-15T10:00:00Z",
   *   "lastUpdated": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post("dashboards")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  createDashboard(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      name: string; 
      description: string; 
      category: string; 
      layout: { columns: number; rows: number; gridSize: string }; 
      widgets: Array<{ type: string; title: string; dataSource: string; position: { x: number; y: number; width: number; height: number } }>; 
      refreshInterval: number; 
      isPublic: boolean 
    }
  ) {
    return this.service.createDashboard(tenantId, body.name, body.description, body.category, body.layout, body.widgets, body.refreshInterval, body.isPublic);
  }

  /**
   * Retrieves all dashboards for the tenant.
   * 
   * This endpoint provides a list of all dashboards with their
   * configuration, status, and metadata information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering and pagination
   * @param query.category - Filter by dashboard category
   * @param query.status - Filter by dashboard status
   * @param query.isPublic - Filter by public/private dashboards
   * @param query.limit - Maximum number of dashboards to return
   * @param query.offset - Number of dashboards to skip
   * @returns Array of dashboards with pagination info
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "dashboardId": "dashboard-789",
   *     "name": "Sales Performance Dashboard",
   *     "category": "sales",
   *     "status": "ACTIVE",
   *     "widgetCount": 5,
   *     "isPublic": false,
   *     "createdAt": "2024-01-15T10:00:00Z",
   *     "lastUpdated": "2024-01-15T14:30:00Z"
   *   }
   * ]
   * ```
   */
  @Get("dashboards")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getDashboards(
    @Param("tenantId") tenantId: string,
    @Query("category") category?: string,
    @Query("status") status?: string,
    @Query("isPublic") isPublic?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.service.getDashboards(tenantId, category, status, isPublic, limit, offset);
  }

  /**
   * Retrieves detailed information about a specific dashboard.
   * 
   * This endpoint provides comprehensive details about a dashboard
   * including widgets, configuration, and real-time data.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param dashboardId - The dashboard identifier
   * @returns Object containing detailed dashboard information
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "dashboardId": "dashboard-789",
   *   "name": "Sales Performance Dashboard",
   *   "description": "Real-time sales metrics and KPIs for executive overview",
   *   "category": "sales",
   *   "status": "ACTIVE",
   *   "layout": {
   *     "columns": 3,
   *     "rows": 2,
   *     "gridSize": "medium"
   *   },
   *   "widgets": [
   *     {
   *       "widgetId": "widget-1",
   *       "type": "kpi",
   *       "title": "Total Revenue",
   *       "dataSource": "revenue_metrics",
   *       "position": { "x": 0, "y": 0, "width": 1, "height": 1 },
   *       "data": {
   *         "value": 1250000,
   *         "change": 0.15,
   *         "trend": "up"
   *       }
   *     }
   *   ],
   *   "refreshInterval": 300,
   *   "isPublic": false,
   *   "createdAt": "2024-01-15T10:00:00Z",
   *   "lastUpdated": "2024-01-15T14:30:00Z"
   * }
   * ```
   */
  @Get("dashboards/:dashboardId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getDashboard(@Param("tenantId") tenantId: string, @Param("dashboardId") dashboardId: string) {
    return this.service.getDashboard(tenantId, dashboardId);
  }

  /**
   * Generates a new chart or visualization.
   * 
   * This endpoint creates various types of charts and visualizations
   * with customizable configurations and data sources.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing chart details
   * @param body.type - Chart type (line, bar, pie, scatter, area, donut)
   * @param body.title - Chart title
   * @param body.dataSource - Data source identifier
   * @param body.config - Chart configuration options
   * @param body.filters - Data filters to apply
   * @param body.timeRange - Time range for data
   * @returns Object containing chart details and data
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "type": "line",
   *   "title": "Sales Trend Over Time",
   *   "dataSource": "sales_metrics",
   *   "config": {
   *     "xAxis": "date",
   *     "yAxis": "revenue",
   *     "colors": ["#3B82F6", "#10B981"],
   *     "showLegend": true,
   *     "showGrid": true
   *   },
   *   "filters": {
   *     "region": "North America",
   *     "product": "Software"
   *   },
   *   "timeRange": {
   *     "start": "2024-01-01",
   *     "end": "2024-12-31"
   *   }
   * }
   * 
   * // Response format
   * {
   *   "chartId": "chart-456",
   *   "type": "line",
   *   "title": "Sales Trend Over Time",
   *   "dataSource": "sales_metrics",
   *   "status": "GENERATED",
   *   "dataPoints": 365,
   *   "generatedAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post("charts")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  generateChart(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      type: string; 
      title: string; 
      dataSource: string; 
      config: Record<string, any>; 
      filters: Record<string, any>; 
      timeRange: { start: string; end: string } 
    }
  ) {
    return this.service.generateChart(tenantId, body.type, body.title, body.dataSource, body.config, body.filters, body.timeRange);
  }

  /**
   * Updates an existing dashboard.
   * 
   * This endpoint allows modification of dashboard configuration,
   * widgets, and layout with real-time updates.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param dashboardId - The dashboard identifier
   * @param body - Request body containing dashboard updates
   * @param body.name - Updated dashboard name
   * @param body.description - Updated dashboard description
   * @param body.layout - Updated layout configuration
   * @param body.widgets - Updated widget configuration
   * @param body.refreshInterval - Updated refresh interval
   * @returns Object containing updated dashboard information
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "name": "Updated Sales Performance Dashboard",
   *   "description": "Enhanced sales metrics with additional KPIs",
   *   "refreshInterval": 180
   * }
   * ```
   */
  @Put("dashboards/:dashboardId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  updateDashboard(
    @Param("tenantId") tenantId: string,
    @Param("dashboardId") dashboardId: string,
    @Body() body: { 
      name?: string; 
      description?: string; 
      layout?: { columns: number; rows: number; gridSize: string }; 
      widgets?: Array<{ type: string; title: string; dataSource: string; position: { x: number; y: number; width: number; height: number } }>; 
      refreshInterval?: number 
    }
  ) {
    return this.service.updateDashboard(tenantId, dashboardId, body);
  }

  /**
   * Exports dashboard data in various formats.
   * 
   * This endpoint exports dashboard data and visualizations
   * in multiple formats for external use and reporting.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param dashboardId - The dashboard identifier
   * @param query - Query parameters for export
   * @param query.format - Export format (pdf, excel, csv, json)
   * @param query.includeCharts - Whether to include chart images
   * @param query.timeRange - Time range for data export
   * @returns Object containing export details and download URL
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "exportId": "export-789",
   *   "dashboardId": "dashboard-789",
   *   "format": "pdf",
   *   "status": "COMPLETED",
   *   "downloadUrl": "https://storage.company.com/exports/dashboard-789.pdf",
   *   "fileSize": "2.5MB",
   *   "expiresAt": "2024-01-22T10:00:00Z",
   *   "exportedAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Get("dashboards/:dashboardId/export")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  exportDashboard(
    @Param("tenantId") tenantId: string,
    @Param("dashboardId") dashboardId: string,
    @Query("format") format?: string,
    @Query("includeCharts") includeCharts?: string,
    @Query("timeRange") timeRange?: string
  ) {
    return this.service.exportDashboard(tenantId, dashboardId, format, includeCharts, timeRange);
  }

  /**
   * Retrieves visualization analytics and usage metrics.
   * 
   * This endpoint provides comprehensive analytics including
   * dashboard usage, popular visualizations, and performance metrics.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for analytics
   * @param query.period - Time period for analytics (7d, 30d, 90d)
   * @param query.category - Filter by dashboard category
   * @param query.includeUsage - Whether to include usage statistics
   * @returns Object containing visualization analytics and metrics
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "totalDashboards": 15,
   *     "activeDashboards": 12,
   *     "totalCharts": 45,
   *     "avgViewsPerDay": 125
   *   },
   *   "byCategory": [
   *     {
   *       "category": "sales",
   *       "dashboardCount": 5,
   *       "chartCount": 18,
   *       "avgViews": 85
   *     }
   *   ],
   *   "popularVisualizations": [
   *     {
   *       "dashboardId": "dashboard-789",
   *       "name": "Sales Performance Dashboard",
   *       "views": 450,
   *       "lastViewed": "2024-01-15T14:30:00Z"
   *     }
   *   ],
   *   "usage": {
   *     "totalViews": 1875,
   *     "uniqueUsers": 25,
   *     "avgSessionDuration": "8.5 minutes"
   *   }
   * }
   * ```
   */
  @Get("analytics")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getVisualizationAnalytics(
    @Param("tenantId") tenantId: string,
    @Query("period") period?: string,
    @Query("category") category?: string,
    @Query("includeUsage") includeUsage?: string
  ) {
    return this.service.getVisualizationAnalytics(tenantId, period, category, includeUsage);
  }

  /**
   * Creates a custom report builder configuration.
   * 
   * This endpoint allows users to create custom report builders
   * with drag-and-drop functionality and data source integration.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing report builder details
   * @param body.name - Report builder name
   * @param body.description - Report builder description
   * @param body.dataSources - Available data sources
   * @param body.template - Report template configuration
   * @param body.filters - Available filter options
   * @returns Object containing report builder configuration
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "name": "Custom Sales Report Builder",
   *   "description": "Drag-and-drop report builder for sales analytics",
   *   "dataSources": ["sales_data", "customer_data", "product_data"],
   *   "template": {
   *     "sections": ["summary", "details", "charts"],
   *     "layout": "multi-column"
   *   },
   *   "filters": [
   *     {
   *       "field": "date_range",
   *       "type": "date_range",
   *       "label": "Date Range"
   *     }
   *   ]
   * }
   * 
   * // Response format
   * {
   *   "reportBuilderId": "builder-123",
   *   "name": "Custom Sales Report Builder",
   *   "status": "ACTIVE",
   *   "dataSourceCount": 3,
   *   "filterCount": 1,
   *   "createdAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post("report-builders")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  createReportBuilder(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      name: string; 
      description: string; 
      dataSources: string[]; 
      template: { sections: string[]; layout: string }; 
      filters: Array<{ field: string; type: string; label: string }> 
    }
  ) {
    return this.service.createReportBuilder(tenantId, body.name, body.description, body.dataSources, body.template, body.filters);
  }
}
