import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { OnboardingFlow, OnboardingStep, UserProgress, TourStep } from "./onboarding.types";

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  // Get onboarding flow for user
  async getOnboardingFlow(userId: string, tenantId: string): Promise<OnboardingFlow> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true }
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Determine flow based on user role and tenant setup
    const flow = await this.determineOnboardingFlow(user, tenantId);
    
    // Get user progress
    const progress = await this.getUserProgress(userId);
    
    return {
      ...flow,
      progress,
      currentStep: this.getCurrentStep(flow.steps, progress)
    };
  }

  // Complete onboarding step
  async completeOnboardingStep(userId: string, stepId: string, data?: any): Promise<void> {
    await this.prisma.userOnboardingProgress.upsert({
      where: { userId_stepId: { userId, stepId } },
      create: {
        userId,
        stepId,
        completed: true,
        completedAt: new Date(),
        data: data as any
      },
      update: {
        completed: true,
        completedAt: new Date(),
        data: data as any
      }
    });

    this.logger.log(`User ${userId} completed onboarding step ${stepId}`);
  }

  // Skip onboarding step
  async skipOnboardingStep(userId: string, stepId: string, reason?: string): Promise<void> {
    await this.prisma.userOnboardingProgress.upsert({
      where: { userId_stepId: { userId, stepId } },
      create: {
        userId,
        stepId,
        completed: false,
        skipped: true,
        skippedAt: new Date(),
        skipReason: reason
      },
      update: {
        skipped: true,
        skippedAt: new Date(),
        skipReason: reason
      }
    });

    this.logger.log(`User ${userId} skipped onboarding step ${stepId}: ${reason}`);
  }

  // Get user progress
  async getUserProgress(userId: string): Promise<UserProgress> {
    const progress = await this.prisma.userOnboardingProgress.findMany({
      where: { userId }
    });

    const completedSteps = progress.filter(p => p.completed).length;
    const skippedSteps = progress.filter(p => p.skipped).length;
    const totalSteps = await this.getTotalOnboardingSteps();

    return {
      userId,
      completedSteps,
      skippedSteps,
      totalSteps,
      completionRate: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
      lastUpdated: new Date(),
      steps: progress
    };
  }

  // Start in-app tour
  async startTour(userId: string, tourId: string): Promise<TourStep[]> {
    const tour = await this.getTourSteps(tourId);
    
    // Mark tour as started
    await this.prisma.userTourProgress.upsert({
      where: { userId_tourId: { userId, tourId } },
      create: {
        userId,
        tourId,
        startedAt: new Date(),
        currentStep: 0
      },
      update: {
        startedAt: new Date(),
        currentStep: 0
      }
    });

    return tour;
  }

  // Complete tour step
  async completeTourStep(userId: string, tourId: string, stepIndex: number): Promise<void> {
    await this.prisma.userTourProgress.update({
      where: { userId_tourId: { userId, tourId } },
      data: {
        currentStep: stepIndex + 1,
        lastStepCompletedAt: new Date()
      }
    });
  }

  // Complete tour
  async completeTour(userId: string, tourId: string): Promise<void> {
    await this.prisma.userTourProgress.update({
      where: { userId_tourId: { userId, tourId } },
      data: {
        completed: true,
        completedAt: new Date()
      }
    });

    this.logger.log(`User ${userId} completed tour ${tourId}`);
  }

  // Get available tours
  async getAvailableTours(userId: string, tenantId: string): Promise<any[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true }
    });

    if (!user) {
      return [];
    }

    const tours = [];

    // Basic tour for all users
    tours.push({
      id: "basic-tour",
      name: "Welcome to BenchCRM",
      description: "Learn the basics of using BenchCRM",
      estimatedDuration: "5 minutes",
      steps: 5
    });

    // Role-specific tours
    if (user.role === "OWNER" || user.role === "ADMIN") {
      tours.push({
        id: "admin-tour",
        name: "Admin Dashboard Tour",
        description: "Learn how to manage your organization",
        estimatedDuration: "10 minutes",
        steps: 8
      });
    }

    if (user.role === "MANAGER" || user.role === "REP") {
      tours.push({
        id: "matching-tour",
        name: "Consultant Matching Tour",
        description: "Learn how to find the best consultants",
        estimatedDuration: "8 minutes",
        steps: 6
      });
    }

    // Feature-specific tours
    tours.push({
      id: "billing-tour",
      name: "Billing & Usage Tour",
      description: "Understand your billing and usage",
      estimatedDuration: "3 minutes",
      steps: 4
    });

    return tours;
  }

  // Private helper methods
  private async determineOnboardingFlow(user: any, tenantId: string): Promise<OnboardingFlow> {
    const steps: OnboardingStep[] = [];

    // Welcome step
    steps.push({
      id: "welcome",
      title: "Welcome to BenchCRM",
      description: "Let's get you set up and ready to find the best consultants",
      type: "WELCOME",
      order: 1,
      required: true,
      estimatedTime: 1
    });

    // Profile setup
    steps.push({
      id: "profile-setup",
      title: "Complete Your Profile",
      description: "Add your information to get personalized recommendations",
      type: "PROFILE_SETUP",
      order: 2,
      required: true,
      estimatedTime: 3
    });

    // Team setup (for admins)
    if (user.role === "OWNER" || user.role === "ADMIN") {
      steps.push({
        id: "team-setup",
        title: "Set Up Your Team",
        description: "Invite team members and set up roles",
        type: "TEAM_SETUP",
        order: 3,
        required: true,
        estimatedTime: 5
      });
    }

    // First requirement
    steps.push({
      id: "first-requirement",
      title: "Post Your First Requirement",
      description: "Create your first job requirement to start matching",
      type: "FIRST_REQUIREMENT",
      order: 4,
      required: true,
      estimatedTime: 5
    });

    // Integration setup (optional)
    steps.push({
      id: "integrations",
      title: "Connect Your Tools",
      description: "Integrate with your existing CRM and ATS systems",
      type: "INTEGRATIONS",
      order: 5,
      required: false,
      estimatedTime: 10
    });

    // Billing setup
    steps.push({
      id: "billing-setup",
      title: "Set Up Billing",
      description: "Choose your plan and add payment information",
      type: "BILLING_SETUP",
      order: 6,
      required: true,
      estimatedTime: 3
    });

    return {
      id: `onboarding-${user.role.toLowerCase()}`,
      name: `${user.role} Onboarding`,
      description: "Complete setup to start using BenchCRM",
      steps,
      estimatedDuration: steps.reduce((sum, step) => sum + step.estimatedTime, 0),
      version: "1.0"
    };
  }

  private getCurrentStep(steps: OnboardingStep[], progress: UserProgress): OnboardingStep | null {
    const completedStepIds = progress.steps
      .filter(p => p.completed)
      .map(p => p.stepId);

    const skippedStepIds = progress.steps
      .filter(p => p.skipped)
      .map(p => p.stepId);

    for (const step of steps) {
      if (!completedStepIds.includes(step.id) && !skippedStepIds.includes(step.id)) {
        return step;
      }
    }

    return null; // All steps completed
  }

  private async getTotalOnboardingSteps(): Promise<number> {
    // This would be dynamic based on user role and tenant setup
    return 6;
  }

  private async getTourSteps(tourId: string): Promise<TourStep[]> {
    const tours = {
      "basic-tour": [
        {
          id: "welcome",
          title: "Welcome to BenchCRM",
          description: "This is your dashboard where you can manage consultants and requirements",
          target: "#dashboard",
          position: "bottom",
          content: "Here you can see an overview of your consultants, requirements, and matches."
        },
        {
          id: "navigation",
          title: "Navigation",
          description: "Use the sidebar to navigate between different sections",
          target: "#sidebar",
          position: "right",
          content: "The sidebar contains all the main sections: Consultants, Requirements, Matches, and Settings."
        },
        {
          id: "search",
          title: "Search & Filter",
          description: "Find consultants quickly using search and filters",
          target: "#search-bar",
          position: "bottom",
          content: "Use the search bar to find consultants by name, skills, or location."
        },
        {
          id: "matches",
          title: "View Matches",
          description: "See how consultants match your requirements",
          target: "#matches-section",
          position: "top",
          content: "The matching algorithm shows you the best consultants for each requirement."
        },
        {
          id: "actions",
          title: "Take Action",
          description: "Contact consultants and manage your pipeline",
          target: "#action-buttons",
          position: "left",
          content: "Use the action buttons to contact consultants, schedule interviews, or manage submissions."
        }
      ],
      "admin-tour": [
        {
          id: "admin-dashboard",
          title: "Admin Dashboard",
          description: "Manage your organization from the admin dashboard",
          target: "#admin-dashboard",
          position: "bottom",
          content: "The admin dashboard shows organization-wide metrics and management tools."
        },
        {
          id: "user-management",
          title: "User Management",
          description: "Add and manage team members",
          target: "#user-management",
          position: "right",
          content: "Invite team members, assign roles, and manage permissions."
        },
        {
          id: "billing",
          title: "Billing & Usage",
          description: "Monitor usage and manage billing",
          target: "#billing-section",
          position: "left",
          content: "Track usage, view invoices, and manage your subscription."
        },
        {
          id: "integrations",
          title: "Integrations",
          description: "Connect external systems",
          target: "#integrations",
          position: "top",
          content: "Integrate with your CRM, ATS, and other business tools."
        },
        {
          id: "settings",
          title: "Organization Settings",
          description: "Configure organization-wide settings",
          target: "#org-settings",
          position: "bottom",
          content: "Set up organization preferences, compliance settings, and security policies."
        }
      ],
      "matching-tour": [
        {
          id: "create-requirement",
          title: "Create Requirements",
          description: "Post detailed job requirements",
          target: "#create-requirement",
          position: "bottom",
          content: "Create detailed requirements with skills, location, and other criteria."
        },
        {
          id: "matching-algorithm",
          title: "Matching Algorithm",
          description: "Understand how matching works",
          target: "#matching-explanation",
          position: "right",
          content: "Our AI analyzes skills, experience, location, and other factors to find the best matches."
        },
        {
          id: "review-matches",
          title: "Review Matches",
          description: "Evaluate and compare consultants",
          target: "#match-results",
          position: "top",
          content: "Review match scores, consultant profiles, and detailed comparisons."
        },
        {
          id: "contact-consultants",
          title: "Contact Consultants",
          description: "Reach out to potential matches",
          target: "#contact-actions",
          position: "left",
          content: "Use the contact tools to reach out to consultants and schedule interviews."
        }
      ],
      "billing-tour": [
        {
          id: "usage-overview",
          title: "Usage Overview",
          description: "Monitor your current usage",
          target: "#usage-overview",
          position: "bottom",
          content: "Track your current usage of AI features, storage, and API calls."
        },
        {
          id: "billing-history",
          title: "Billing History",
          description: "View past invoices and payments",
          target: "#billing-history",
          position: "right",
          content: "Access your billing history and download invoices."
        },
        {
          id: "plan-management",
          title: "Plan Management",
          description: "Upgrade or change your plan",
          target: "#plan-management",
          position: "left",
          content: "Manage your subscription, upgrade plans, or add additional features."
        },
        {
          id: "usage-alerts",
          title: "Usage Alerts",
          description: "Set up usage notifications",
          target: "#usage-alerts",
          position: "top",
          content: "Configure alerts to stay informed about your usage and costs."
        }
      ]
    };

    return tours[tourId] || [];
  }
}
