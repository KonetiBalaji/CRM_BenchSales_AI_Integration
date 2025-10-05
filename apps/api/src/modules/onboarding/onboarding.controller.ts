import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { OnboardingService } from "./onboarding.service";
import { OnboardingFlow, OnboardingStep, UserProgress, TourStep } from "./onboarding.types";

@Controller("onboarding")
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  // Get onboarding flow for current user
  @Get("flow")
  async getOnboardingFlow(@Request() req: any): Promise<OnboardingFlow> {
    return this.onboardingService.getOnboardingFlow(req.user.id, req.user.tenantId);
  }

  // Complete onboarding step
  @Post("steps/:stepId/complete")
  async completeOnboardingStep(
    @Request() req: any,
    @Param("stepId") stepId: string,
    @Body() data?: any
  ): Promise<{ success: boolean }> {
    await this.onboardingService.completeOnboardingStep(req.user.id, stepId, data);
    return { success: true };
  }

  // Skip onboarding step
  @Post("steps/:stepId/skip")
  async skipOnboardingStep(
    @Request() req: any,
    @Param("stepId") stepId: string,
    @Body() body: { reason?: string }
  ): Promise<{ success: boolean }> {
    await this.onboardingService.skipOnboardingStep(req.user.id, stepId, body.reason);
    return { success: true };
  }

  // Get user progress
  @Get("progress")
  async getUserProgress(@Request() req: any): Promise<UserProgress> {
    return this.onboardingService.getUserProgress(req.user.id);
  }

  // Get available tours
  @Get("tours")
  async getAvailableTours(@Request() req: any): Promise<any[]> {
    return this.onboardingService.getAvailableTours(req.user.id, req.user.tenantId);
  }

  // Start tour
  @Post("tours/:tourId/start")
  async startTour(
    @Request() req: any,
    @Param("tourId") tourId: string
  ): Promise<{ steps: TourStep[] }> {
    const steps = await this.onboardingService.startTour(req.user.id, tourId);
    return { steps };
  }

  // Complete tour step
  @Post("tours/:tourId/steps/:stepIndex/complete")
  async completeTourStep(
    @Request() req: any,
    @Param("tourId") tourId: string,
    @Param("stepIndex") stepIndex: string
  ): Promise<{ success: boolean }> {
    await this.onboardingService.completeTourStep(req.user.id, tourId, parseInt(stepIndex));
    return { success: true };
  }

  // Complete tour
  @Post("tours/:tourId/complete")
  async completeTour(
    @Request() req: any,
    @Param("tourId") tourId: string
  ): Promise<{ success: boolean }> {
    await this.onboardingService.completeTour(req.user.id, tourId);
    return { success: true };
  }
}
