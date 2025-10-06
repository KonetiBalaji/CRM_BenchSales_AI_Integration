/**
 * @fileoverview Predictive Analytics Controller
 * 
 * This controller provides predictive analytics endpoints for the CRM BenchSales AI Integration application.
 * It handles forecasting, trend analysis, and predictive modeling capabilities.
 * 
 * Key features:
 * - Sales forecasting and prediction
 * - Trend analysis and pattern recognition
 * - Predictive modeling and machine learning
 * - Risk assessment and mitigation
 * - Performance prediction
 * - Role-based access control for different user types
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { PredictiveAnalyticsService } from "./predictive-analytics.service";

/**
 * Controller for predictive analytics functionality.
 * 
 * This controller provides endpoints for managing predictive models,
 * forecasting, and trend analysis with comprehensive
 * machine learning and risk assessment capabilities.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Generate sales forecast
 * POST /tenants/{tenantId}/predictive-analytics/forecasts
 * {
 *   "type": "sales",
 *   "timeHorizon": "6_months",
 *   "dataSource": "sales_history"
 * }
 * 
 * // Analyze trends
 * POST /tenants/{tenantId}/predictive-analytics/trends
 * {
 *   "metric": "revenue",
 *   "period": "quarterly"
 * }
 * ```
 */
@Controller("tenants/:tenantId/predictive-analytics")
export class PredictiveAnalyticsController {
  /**
   * Initializes the predictive analytics controller with the service dependency.
   * 
   * @param service - The predictive analytics service for business logic
   */
  constructor(private readonly service: PredictiveAnalyticsService) {}

  /**
   * Generates a predictive forecast for specified metrics.
   * 
   * This endpoint creates comprehensive forecasts using machine learning
   * algorithms and historical data analysis.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing forecast details
   * @param body.type - Type of forecast (sales, revenue, customer_acquisition, churn)
   * @param body.timeHorizon - Forecast time horizon (1_month, 3_months, 6_months, 1_year)
   * @param body.dataSource - Data source for historical analysis
   * @param body.confidenceLevel - Confidence level for predictions (0.8, 0.9, 0.95)
   * @param body.seasonality - Whether to include seasonality adjustments
   * @param body.externalFactors - External factors to consider
   * @returns Object containing forecast details and predictions
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "type": "sales",
   *   "timeHorizon": "6_months",
   *   "dataSource": "sales_history",
   *   "confidenceLevel": 0.9,
   *   "seasonality": true,
   *   "externalFactors": ["market_trends", "competitor_activity", "economic_indicators"]
   * }
   * 
   * // Response format
   * {
   *   "forecastId": "forecast-789",
   *   "type": "sales",
   *   "timeHorizon": "6_months",
   *   "status": "COMPLETED",
   *   "confidenceLevel": 0.9,
   *   "accuracy": 0.87,
   *   "predictions": [
   *     {
   *       "period": "2024-02",
   *       "predictedValue": 125000,
   *       "confidenceInterval": {
   *         "lower": 110000,
   *         "upper": 140000
   *       }
   *     }
   *   ],
   *   "generatedAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post("forecasts")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  generateForecast(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      type: string; 
      timeHorizon: string; 
      dataSource: string; 
      confidenceLevel: number; 
      seasonality: boolean; 
      externalFactors: string[] 
    }
  ) {
    return this.service.generateForecast(tenantId, body.type, body.timeHorizon, body.dataSource, body.confidenceLevel, body.seasonality, body.externalFactors);
  }

  /**
   * Analyzes trends and patterns in business metrics.
   * 
   * This endpoint performs comprehensive trend analysis using
   * statistical methods and pattern recognition algorithms.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing trend analysis details
   * @param body.metric - Metric to analyze (revenue, sales, customer_count, conversion_rate)
   * @param body.period - Analysis period (monthly, quarterly, yearly)
   * @param body.timeRange - Time range for analysis
   * @param body.includeSeasonality - Whether to analyze seasonal patterns
   * @param body.includeAnomalies - Whether to detect anomalies
   * @returns Object containing trend analysis results
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "metric": "revenue",
   *   "period": "quarterly",
   *   "timeRange": {
   *     "start": "2023-01-01",
   *     "end": "2024-12-31"
   *   },
   *   "includeSeasonality": true,
   *   "includeAnomalies": true
   * }
   * 
   * // Response format
   * {
   *   "analysisId": "analysis-456",
   *   "metric": "revenue",
   *   "period": "quarterly",
   *   "trend": "increasing",
   *   "trendStrength": 0.75,
   *   "seasonality": {
   *     "detected": true,
   *     "pattern": "Q4 peak, Q1 dip",
   *     "strength": 0.6
   *   },
   *   "anomalies": [
   *     {
   *       "date": "2023-06-15",
   *       "value": 150000,
   *       "expectedValue": 120000,
   *       "deviation": 0.25
   *     }
   *   ],
   *   "forecast": {
   *     "nextPeriod": 135000,
   *     "confidence": 0.82
   *   },
   *   "analyzedAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post("trends")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  analyzeTrends(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      metric: string; 
      period: string; 
      timeRange: { start: string; end: string }; 
      includeSeasonality: boolean; 
      includeAnomalies: boolean 
    }
  ) {
    return this.service.analyzeTrends(tenantId, body.metric, body.period, body.timeRange, body.includeSeasonality, body.includeAnomalies);
  }

  /**
   * Creates a predictive model for specific business scenarios.
   * 
   * This endpoint builds and trains machine learning models
   * for various business prediction scenarios.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing model details
   * @param body.modelType - Type of model (regression, classification, clustering)
   * @param body.objective - Model objective (churn_prediction, sales_forecast, customer_segmentation)
   * @param body.features - Features to include in the model
   * @param body.trainingData - Training data configuration
   * @param body.algorithm - ML algorithm to use (random_forest, neural_network, linear_regression)
   * @returns Object containing model details and training status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "modelType": "classification",
   *   "objective": "churn_prediction",
   *   "features": ["customer_tenure", "usage_frequency", "support_tickets", "payment_history"],
   *   "trainingData": {
   *     "startDate": "2023-01-01",
   *     "endDate": "2024-01-01",
   *     "sampleSize": 10000
   *   },
   *   "algorithm": "random_forest"
   * }
   * 
   * // Response format
   * {
   *   "modelId": "model-123",
   *   "modelType": "classification",
   *   "objective": "churn_prediction",
   *   "status": "TRAINING",
   *   "algorithm": "random_forest",
   *   "features": ["customer_tenure", "usage_frequency", "support_tickets", "payment_history"],
   *   "trainingProgress": 0.0,
   *   "estimatedCompletion": "2024-01-15T12:00:00Z",
   *   "createdAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post("models")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  createPredictiveModel(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      modelType: string; 
      objective: string; 
      features: string[]; 
      trainingData: { startDate: string; endDate: string; sampleSize: number }; 
      algorithm: string 
    }
  ) {
    return this.service.createPredictiveModel(tenantId, body.modelType, body.objective, body.features, body.trainingData, body.algorithm);
  }

  /**
   * Retrieves all predictive models for the tenant.
   * 
   * This endpoint provides a list of all predictive models with their
   * status, performance metrics, and configuration information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering and pagination
   * @param query.status - Model status filter
   * @param query.modelType - Filter by model type
   * @param query.objective - Filter by model objective
   * @param query.limit - Maximum number of models to return
   * @param query.offset - Number of models to skip
   * @returns Array of predictive models with pagination info
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "modelId": "model-123",
   *     "modelType": "classification",
   *     "objective": "churn_prediction",
   *     "status": "ACTIVE",
   *     "accuracy": 0.87,
   *     "lastTrained": "2024-01-10T14:30:00Z",
   *     "predictionsCount": 1250
   *   }
   * ]
   * ```
   */
  @Get("models")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getPredictiveModels(
    @Param("tenantId") tenantId: string,
    @Query("status") status?: string,
    @Query("modelType") modelType?: string,
    @Query("objective") objective?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.service.getPredictiveModels(tenantId, status, modelType, objective, limit, offset);
  }

  /**
   * Makes predictions using a trained model.
   * 
   * This endpoint uses trained predictive models to make
   * predictions on new data with confidence scores.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param modelId - The model identifier
   * @param body - Request body containing prediction data
   * @param body.inputData - Input data for prediction
   * @param body.includeConfidence - Whether to include confidence scores
   * @param body.explainPrediction - Whether to provide prediction explanation
   * @returns Object containing prediction results
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "inputData": {
   *     "customer_tenure": 24,
   *     "usage_frequency": 0.8,
   *     "support_tickets": 2,
   *     "payment_history": "good"
   *   },
   *   "includeConfidence": true,
   *   "explainPrediction": true
   * }
   * 
   * // Response format
   * {
   *   "predictionId": "pred-789",
   *   "modelId": "model-123",
   *   "prediction": "low_risk",
   *   "confidence": 0.92,
   *   "probability": {
   *     "low_risk": 0.92,
   *     "high_risk": 0.08
   *   },
   *   "explanation": {
   *     "keyFactors": ["low support tickets", "good payment history"],
   *     "featureImportance": {
   *       "payment_history": 0.4,
   *       "usage_frequency": 0.3,
   *       "customer_tenure": 0.2,
   *       "support_tickets": 0.1
   *     }
   *   },
   *   "predictedAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post("models/:modelId/predict")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  makePrediction(
    @Param("tenantId") tenantId: string,
    @Param("modelId") modelId: string,
    @Body() body: { inputData: Record<string, any>; includeConfidence: boolean; explainPrediction: boolean }
  ) {
    return this.service.makePrediction(tenantId, modelId, body.inputData, body.includeConfidence, body.explainPrediction);
  }

  /**
   * Performs risk assessment and analysis.
   * 
   * This endpoint analyzes various business risks and provides
   * mitigation strategies and recommendations.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing risk assessment details
   * @param body.riskType - Type of risk to assess (financial, operational, market, compliance)
   * @param body.scope - Assessment scope (customer, vendor, project, overall)
   * @param body.timeHorizon - Time horizon for risk assessment
   * @param body.includeMitigation - Whether to include mitigation strategies
   * @returns Object containing risk assessment results
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "riskType": "financial",
   *   "scope": "customer",
   *   "timeHorizon": "6_months",
   *   "includeMitigation": true
   * }
   * 
   * // Response format
   * {
   *   "assessmentId": "risk-456",
   *   "riskType": "financial",
   *   "scope": "customer",
   *   "overallRisk": "medium",
   *   "riskScore": 0.65,
   *   "riskFactors": [
   *     {
   *       "factor": "payment_delays",
   *       "impact": "high",
   *       "probability": 0.3,
   *       "riskScore": 0.75
   *     }
   *   ],
   *   "mitigationStrategies": [
   *     {
   *       "strategy": "implement_credit_checks",
   *       "effectiveness": 0.8,
   *       "cost": "low",
   *       "timeline": "1_month"
   *     }
   *   ],
   *   "assessedAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post("risk-assessment")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  performRiskAssessment(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      riskType: string; 
      scope: string; 
      timeHorizon: string; 
      includeMitigation: boolean 
    }
  ) {
    return this.service.performRiskAssessment(tenantId, body.riskType, body.scope, body.timeHorizon, body.includeMitigation);
  }

  /**
   * Retrieves predictive analytics insights and recommendations.
   * 
   * This endpoint provides comprehensive insights and actionable
   * recommendations based on predictive analysis.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for insights
   * @param query.category - Insight category (sales, customer, operational, financial)
   * @param query.priority - Priority level (high, medium, low)
   * @param query.timeRange - Time range for insights
   * @returns Object containing insights and recommendations
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "insights": [
   *     {
   *       "insightId": "insight-123",
   *       "category": "sales",
   *       "title": "Sales Growth Opportunity",
   *       "description": "Q2 shows 25% growth potential based on historical patterns",
   *       "confidence": 0.85,
   *       "impact": "high",
   *       "recommendations": [
   *         "Increase marketing budget by 15%",
   *         "Focus on high-value customer segments"
   *       ]
   *     }
   *   ],
   *   "summary": {
   *     "totalInsights": 8,
   *     "highPriority": 3,
   *     "avgConfidence": 0.82
   *   },
   *   "generatedAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Get("insights")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getPredictiveInsights(
    @Param("tenantId") tenantId: string,
    @Query("category") category?: string,
    @Query("priority") priority?: string,
    @Query("timeRange") timeRange?: string
  ) {
    return this.service.getPredictiveInsights(tenantId, category, priority, timeRange);
  }
}
