import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { OnboardingService } from "./onboarding.service";
import { OnboardingController } from "./onboarding.controller";

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [OnboardingService],
  controllers: [OnboardingController],
  exports: [OnboardingService]
})
export class OnboardingModule {}
