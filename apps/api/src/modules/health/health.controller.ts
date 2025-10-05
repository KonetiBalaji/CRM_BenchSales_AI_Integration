import { Controller, Get } from "@nestjs/common";

import { Public } from "../auth/decorators/public.decorator";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  getHealth() {
    return this.healthService.getHealth();
  }

  @Public()
  @Get("liveness")
  liveness() {
    return this.healthService.liveness();
  }

  @Public()
  @Get("readiness")
  readiness() {
    return this.healthService.readiness();
  }
}
