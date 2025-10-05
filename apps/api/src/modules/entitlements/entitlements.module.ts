import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { EntitlementsService } from "./entitlements.service";

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [EntitlementsService],
  exports: [EntitlementsService]
})
export class EntitlementsModule {}



