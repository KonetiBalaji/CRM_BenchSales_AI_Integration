import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { MigrationService } from "./migration.service";
import { MigrationController } from "./migration.controller";

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [MigrationService],
  controllers: [MigrationController],
  exports: [MigrationService]
})
export class MigrationModule {}
