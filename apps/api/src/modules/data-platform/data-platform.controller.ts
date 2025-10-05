import { Controller, Get, Param } from "@nestjs/common";

import { DataPlatformService, DataPlatformOverview } from "./data-platform.service";

@Controller("tenants/:tenantId/data-platform")
export class DataPlatformController {
  constructor(private readonly dataPlatform: DataPlatformService) {}

  @Get("overview")
  getOverview(@Param("tenantId") tenantId: string): Promise<DataPlatformOverview> {
    return this.dataPlatform.overview(tenantId);
  }
}
