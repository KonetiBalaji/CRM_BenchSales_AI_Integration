/**
 * Alerts Service
 * Manages monitoring alerts and notifications
 */

import { Injectable, Logger } from '@nestjs/common';

export interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  metadata?: any;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  async sendAlert(alert: Alert): Promise<void> {
    this.logger.warn(`ALERT [${alert.severity}]: ${alert.title}`, alert);
    
    // Alerting integration - configure PagerDuty, Slack, or email for production
    
    if (alert.severity === 'critical') {
      // Send immediate notification
      this.logger.error(`CRITICAL ALERT: ${alert.title}`, alert);
    }
  }

  async crossTenantAccessDetected(tenantId: string, accessedTenant: string, userId: string) {
    await this.sendAlert({
      id: `cross-tenant-${Date.now()}`,
      severity: 'critical',
      title: 'Cross-Tenant Access Attempt Detected',
      message: `User ${userId} from tenant ${tenantId} attempted to access tenant ${accessedTenant}`,
      source: 'security',
      timestamp: new Date(),
      metadata: { tenantId, accessedTenant, userId },
    });
  }

  async highErrorRate(service: string, errorRate: number) {
    await this.sendAlert({
      id: `error-rate-${Date.now()}`,
      severity: 'high',
      title: 'High Error Rate Detected',
      message: `Service ${service} has error rate of ${errorRate}%`,
      source: 'monitoring',
      timestamp: new Date(),
      metadata: { service, errorRate },
    });
  }

  async costAnomalyDetected(tenantId: string, currentCost: number, threshold: number) {
    await this.sendAlert({
      id: `cost-anomaly-${Date.now()}`,
      severity: 'medium',
      title: 'Cost Anomaly Detected',
      message: `Tenant ${tenantId} cost ($${currentCost}) exceeded threshold ($${threshold})`,
      source: 'finops',
      timestamp: new Date(),
      metadata: { tenantId, currentCost, threshold },
    });
  }
}
