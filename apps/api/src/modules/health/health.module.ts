import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { CacheModule } from "../../infrastructure/cache/cache.module";
import { CircuitBreakerModule } from "../../infrastructure/circuit-breaker/circuit-breaker.module";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
  imports: [ConfigModule, PrismaModule, CacheModule, CircuitBreakerModule],
  controllers: [HealthController],
  providers: [HealthService]
})
export class HealthModule {}
