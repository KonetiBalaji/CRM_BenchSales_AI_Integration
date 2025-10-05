import { context, trace } from "@opentelemetry/api";
import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";

import { RequestContextMiddleware, RequestContextModule } from "./infrastructure/context";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { CacheModule } from "./infrastructure/cache/cache.module";
import { RateLimitModule } from "./infrastructure/rate-limit/rate-limit.module";
import { CircuitBreakerModule } from "./infrastructure/circuit-breaker/circuit-breaker.module";
import { AppConfig } from "./config/app.config";
import { AuthModule } from "./modules/auth/auth.module";
import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "./modules/auth/guards/roles.guard";
import { TenantAccessGuard } from "./modules/auth/guards/tenant.guard";
import { AiGatewayModule } from "./modules/ai-gateway/ai-gateway.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuditInterceptor } from "./modules/audit/audit.interceptor";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { ConsultantsModule } from "./modules/consultants/consultants.module";
import { DataPlatformModule } from "./modules/data-platform/data-platform.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { DedupeModule } from "./modules/dedupe/dedupe.module";
import { HealthModule } from "./modules/health/health.module";
import { MatchingModule } from "./modules/matching/matching.module";
import { OntologyModule } from "./modules/ontology/ontology.module";
import { VectorSearchModule } from "./modules/vector-search/vector-search.module";
import { RequirementsModule } from "./modules/requirements/requirements.module";
import { SubmissionsModule } from "./modules/submissions/submissions.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { AiAssistantsModule } from "./modules/ai-assistants/ai-assistants.module";
import { WorkflowModule } from "./modules/workflow/workflow.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { EntitlementsModule } from "./modules/entitlements/entitlements.module";
import { ComplianceModule } from "./modules/compliance/compliance.module";
import { IntegrationsModule } from "./modules/integrations/integrations.module";
import { BillingModule } from "./modules/billing/billing.module";
import { EvalsModule } from "./modules/evals/evals.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [AppConfig]
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
        transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined,
        base: {
          service: "benchcrm-api",
          environment: process.env.NODE_ENV ?? "development"
        },
        messageKey: "message",
        mixin() {
          const span = trace.getSpan(context.active());
          if (!span) {
            return {};
          }
          const { traceId, spanId } = span.spanContext();
          return {
            trace_id: traceId,
            span_id: spanId
          };
        }
      }
    }),
    RequestContextModule,
    PrismaModule,
    CacheModule,
    RateLimitModule,
    CircuitBreakerModule,
    AuthModule,
    AuditModule,
    HealthModule,
    TenantsModule,
    ConsultantsModule,
    DocumentsModule,
    DedupeModule,
    OntologyModule,
    VectorSearchModule,
    DataPlatformModule,
    RequirementsModule,
    MatchingModule,
    SubmissionsModule,
    AnalyticsModule,
    AiGatewayModule,
    AiAssistantsModule,
    WorkflowModule,
    NotificationsModule,
    EntitlementsModule,
    ComplianceModule,
    IntegrationsModule,
    BillingModule,
    EvalsModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantAccessGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}

