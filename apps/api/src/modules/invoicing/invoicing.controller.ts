/**
 * @fileoverview Invoicing Controller
 * 
 * This controller provides invoicing and payment management endpoints for the CRM BenchSales AI Integration application.
 * It handles invoice generation, payment tracking, and financial reporting capabilities.
 * 
 * Key features:
 * - Automated invoice generation
 * - Payment tracking and reconciliation
 * - Financial reporting and analytics
 * - Tax calculation and compliance
 * - Multi-currency support
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
import { InvoicingService } from "./invoicing.service";

/**
 * Controller for invoicing and payment management functionality.
 * 
 * This controller provides endpoints for generating invoices, tracking payments,
 * and managing financial operations with comprehensive reporting capabilities.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Generate invoice for a placement
 * POST /tenants/{tenantId}/invoicing/invoices
 * {
 *   "placementId": "placement-123",
 *   "clientId": "client-456",
 *   "amount": 15000,
 *   "currency": "USD"
 * }
 * 
 * // Get payment status
 * GET /tenants/{tenantId}/invoicing/payments/{paymentId}
 * ```
 */
@Controller("tenants/:tenantId/invoicing")
export class InvoicingController {
  /**
   * Initializes the invoicing controller with the service dependency.
   * 
   * @param service - The invoicing service for business logic
   */
  constructor(private readonly service: InvoicingService) {}

  /**
   * Creates a new invoice for a placement or service.
   * 
   * This endpoint generates a new invoice with proper line items,
   * tax calculations, and payment terms.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing invoice parameters
   * @param body.placementId - The placement ID to invoice for
   * @param body.clientId - The client ID for billing
   * @param body.amount - Invoice amount
   * @param body.currency - Currency code (USD, EUR, etc.)
   * @param body.dueDate - Payment due date
   * @param body.lineItems - Detailed line items for the invoice
   * @returns Object containing invoice details and status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "placementId": "placement-123",
   *   "clientId": "client-456",
   *   "amount": 15000,
   *   "currency": "USD",
   *   "dueDate": "2024-02-15",
   *   "lineItems": [
   *     {
   *       "description": "Senior React Developer - 3 months",
   *       "quantity": 3,
   *       "rate": 5000,
   *       "amount": 15000
   *     }
   *   ]
   * }
   * 
   * // Response format
   * {
   *   "invoiceId": "INV-2024-001",
   *   "invoiceNumber": "INV-2024-001",
   *   "status": "DRAFT",
   *   "amount": 15000,
   *   "currency": "USD",
   *   "dueDate": "2024-02-15",
   *   "createdAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post("invoices")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  createInvoice(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      placementId: string; 
      clientId: string; 
      amount: number; 
      currency: string; 
      dueDate: string; 
      lineItems: Array<{ description: string; quantity: number; rate: number; amount: number }> 
    }
  ) {
    return this.service.createInvoice(tenantId, body.placementId, body.clientId, body.amount, body.currency, body.dueDate, body.lineItems);
  }

  /**
   * Retrieves all invoices for the tenant.
   * 
   * This endpoint provides a list of all invoices with their
   * status, amounts, and payment information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering and pagination
   * @param query.status - Invoice status filter
   * @param query.clientId - Filter by client ID
   * @param query.dateFrom - Start date filter
   * @param query.dateTo - End date filter
   * @param query.limit - Maximum number of invoices to return
   * @param query.offset - Number of invoices to skip
   * @returns Array of invoices with pagination info
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "invoiceId": "INV-2024-001",
   *     "invoiceNumber": "INV-2024-001",
   *     "clientName": "Tech Corp",
   *     "amount": 15000,
   *     "currency": "USD",
   *     "status": "PAID",
   *     "dueDate": "2024-02-15",
   *     "paidDate": "2024-02-10",
   *     "createdAt": "2024-01-15T10:00:00Z"
   *   }
   * ]
   * ```
   */
  @Get("invoices")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getInvoices(
    @Param("tenantId") tenantId: string,
    @Query("status") status?: string,
    @Query("clientId") clientId?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.service.getInvoices(tenantId, status, clientId, dateFrom, dateTo, limit, offset);
  }

  /**
   * Retrieves detailed information about a specific invoice.
   * 
   * This endpoint provides comprehensive details about an invoice
   * including line items, payment history, and status.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param invoiceId - The invoice identifier
   * @returns Object containing detailed invoice information
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "invoiceId": "INV-2024-001",
   *   "invoiceNumber": "INV-2024-001",
   *   "client": {
   *     "id": "client-456",
   *     "name": "Tech Corp",
   *     "address": "123 Tech St, San Francisco, CA"
   *   },
   *   "placement": {
   *     "id": "placement-123",
   *     "consultantName": "John Doe",
   *     "role": "Senior React Developer"
   *   },
   *   "lineItems": [
   *     {
   *       "description": "Senior React Developer - 3 months",
   *       "quantity": 3,
   *       "rate": 5000,
   *       "amount": 15000
   *     }
   *   ],
   *   "subtotal": 15000,
   *   "tax": 1200,
   *   "total": 16200,
   *   "status": "PAID",
   *   "dueDate": "2024-02-15",
   *   "paidDate": "2024-02-10"
   * }
   * ```
   */
  @Get("invoices/:invoiceId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getInvoice(@Param("tenantId") tenantId: string, @Param("invoiceId") invoiceId: string) {
    return this.service.getInvoice(tenantId, invoiceId);
  }

  /**
   * Updates an existing invoice.
   * 
   * This endpoint allows modification of invoice details including
   * line items, amounts, and payment terms.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param invoiceId - The invoice identifier
   * @param body - Request body containing updated invoice data
   * @returns Object containing updated invoice details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "amount": 16000,
   *   "dueDate": "2024-02-20",
   *   "lineItems": [
   *     {
   *       "description": "Senior React Developer - 3 months (Updated)",
   *       "quantity": 3,
   *       "rate": 5333.33,
   *       "amount": 16000
   *     }
   *   ]
   * }
   * ```
   */
  @Put("invoices/:invoiceId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  updateInvoice(
    @Param("tenantId") tenantId: string,
    @Param("invoiceId") invoiceId: string,
    @Body() body: { amount?: number; dueDate?: string; lineItems?: Array<{ description: string; quantity: number; rate: number; amount: number }> }
  ) {
    return this.service.updateInvoice(tenantId, invoiceId, body);
  }

  /**
   * Records a payment for an invoice.
   * 
   * This endpoint records payment information and updates invoice status
   * with payment tracking and reconciliation.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param invoiceId - The invoice identifier
   * @param body - Request body containing payment information
   * @param body.amount - Payment amount
   * @param body.paymentDate - Date of payment
   * @param body.paymentMethod - Payment method (check, wire, credit_card)
   * @param body.reference - Payment reference number
   * @param body.notes - Additional payment notes
   * @returns Object containing payment confirmation and updated invoice status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "amount": 16200,
   *   "paymentDate": "2024-02-10",
   *   "paymentMethod": "wire",
   *   "reference": "WIRE-2024-001",
   *   "notes": "Payment received via wire transfer"
   * }
   * 
   * // Response format
   * {
   *   "paymentId": "PAY-2024-001",
   *   "invoiceId": "INV-2024-001",
   *   "amount": 16200,
   *   "paymentDate": "2024-02-10",
   *   "status": "PAID",
   *   "balance": 0
   * }
   * ```
   */
  @Post("invoices/:invoiceId/payments")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  recordPayment(
    @Param("tenantId") tenantId: string,
    @Param("invoiceId") invoiceId: string,
    @Body() body: { 
      amount: number; 
      paymentDate: string; 
      paymentMethod: string; 
      reference: string; 
      notes?: string 
    }
  ) {
    return this.service.recordPayment(tenantId, invoiceId, body.amount, body.paymentDate, body.paymentMethod, body.reference, body.notes);
  }

  /**
   * Retrieves financial analytics and reporting data.
   * 
   * This endpoint provides comprehensive financial insights including
   * revenue trends, payment analytics, and outstanding balances.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for analytics
   * @param query.period - Time period for analytics (7d, 30d, 90d, 1y)
   * @param query.metricType - Type of metrics to retrieve
   * @param query.currency - Currency filter
   * @returns Object containing financial analytics and metrics
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "totalRevenue": 150000,
   *     "outstandingBalance": 25000,
   *     "paidInvoices": 45,
   *     "pendingInvoices": 8
   *   },
   *   "trends": [
   *     {
   *       "month": "2024-01",
   *       "revenue": 50000,
   *       "invoices": 15,
   *       "avgPaymentTime": "12 days"
   *     }
   *   ],
   *   "byClient": [
   *     {
   *       "clientName": "Tech Corp",
   *       "totalRevenue": 45000,
   *       "outstandingBalance": 5000,
   *       "paymentHistory": "Good"
   *     }
   *   ]
   * }
   * ```
   */
  @Get("analytics")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getAnalytics(
    @Param("tenantId") tenantId: string,
    @Query("period") period?: string,
    @Query("metricType") metricType?: string,
    @Query("currency") currency?: string
  ) {
    return this.service.getAnalytics(tenantId, period, metricType, currency);
  }

  /**
   * Generates and sends invoice to client.
   * 
   * This endpoint generates a formatted invoice and sends it to the client
   * via email with proper formatting and attachments.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param invoiceId - The invoice identifier
   * @param body - Request body containing send parameters
   * @param body.email - Client email address
   * @param body.message - Optional custom message
   * @param body.format - Invoice format (pdf, html)
   * @returns Object containing send confirmation and tracking info
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "email": "billing@techcorp.com",
   *   "message": "Please find attached invoice for your review.",
   *   "format": "pdf"
   * }
   * 
   * // Response format
   * {
   *   "sendId": "SEND-2024-001",
   *   "status": "SENT",
   *   "sentTo": "billing@techcorp.com",
   *   "sentAt": "2024-01-15T10:30:00Z",
   *   "trackingId": "TRACK-2024-001"
   * }
   * ```
   */
  @Post("invoices/:invoiceId/send")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  sendInvoice(
    @Param("tenantId") tenantId: string,
    @Param("invoiceId") invoiceId: string,
    @Body() body: { email: string; message?: string; format: string }
  ) {
    return this.service.sendInvoice(tenantId, invoiceId, body.email, body.message, body.format);
  }
}
