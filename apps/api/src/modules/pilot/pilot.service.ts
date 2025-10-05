import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { PilotProgram, PilotMetrics, PilotFeedback } from "./pilot.types";

@Injectable()
export class PilotService {
  private readonly logger = new Logger(PilotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  // Create pilot program
  async createPilotProgram(
    tenantId: string,
    program: Omit<PilotProgram, "id" | "currentParticipants" | "status" | "metrics" | "createdAt">
  ): Promise<PilotProgram> {
    const pilotProgram = await this.prisma.pilotProgram.create({
      data: {
        tenantId,
        name: program.name,
        description: program.description,
        startDate: program.startDate,
        endDate: program.endDate,
        maxParticipants: program.maxParticipants,
        currentParticipants: 0,
        status: "PLANNING",
        features: program.features,
        successCriteria: program.successCriteria,
        metrics: {
          totalParticipants: 0,
          activeParticipants: 0,
          completionRate: 0,
          satisfactionScore: 0,
          featureUsage: {},
          feedback: []
        }
      }
    });

    this.logger.log(`Created pilot program ${pilotProgram.id} for tenant ${tenantId}`);
    return this.mapToPilotProgram(pilotProgram);
  }

  // Get pilot programs for tenant
  async getPilotPrograms(tenantId: string): Promise<PilotProgram[]> {
    const programs = await this.prisma.pilotProgram.findMany({
      where: { tenantId },
      include: {
        participants: true,
        feedback: true
      },
      orderBy: { createdAt: "desc" }
    });

    return programs.map(program => this.mapToPilotProgram(program));
  }

  // Get pilot program by ID
  async getPilotProgram(programId: string, tenantId: string): Promise<PilotProgram | null> {
    const program = await this.prisma.pilotProgram.findFirst({
      where: { id: programId, tenantId },
      include: {
        participants: true,
        feedback: true
      }
    });

    return program ? this.mapToPilotProgram(program) : null;
  }

  // Join pilot program
  async joinPilotProgram(programId: string, userId: string, tenantId: string): Promise<void> {
    const program = await this.prisma.pilotProgram.findFirst({
      where: { id: programId, tenantId }
    });

    if (!program) {
      throw new Error("Pilot program not found");
    }

    if (program.status !== "ACTIVE") {
      throw new Error("Pilot program is not active");
    }

    if (program.currentParticipants >= program.maxParticipants) {
      throw new Error("Pilot program is full");
    }

    // Check if user is already a participant
    const existingParticipant = await this.prisma.pilotParticipant.findFirst({
      where: { programId, userId }
    });

    if (existingParticipant) {
      throw new Error("User is already a participant in this pilot program");
    }

    // Add participant
    await this.prisma.pilotParticipant.create({
      data: {
        programId,
        userId,
        joinedAt: new Date(),
        status: "ACTIVE"
      }
    });

    // Update participant count
    await this.prisma.pilotProgram.update({
      where: { id: programId },
      data: {
        currentParticipants: {
          increment: 1
        }
      }
    });

    this.logger.log(`User ${userId} joined pilot program ${programId}`);
  }

  // Leave pilot program
  async leavePilotProgram(programId: string, userId: string, tenantId: string): Promise<void> {
    const program = await this.prisma.pilotProgram.findFirst({
      where: { id: programId, tenantId }
    });

    if (!program) {
      throw new Error("Pilot program not found");
    }

    // Remove participant
    const participant = await this.prisma.pilotParticipant.findFirst({
      where: { programId, userId }
    });

    if (!participant) {
      throw new Error("User is not a participant in this pilot program");
    }

    await this.prisma.pilotParticipant.update({
      where: { id: participant.id },
      data: {
        status: "LEFT",
        leftAt: new Date()
      }
    });

    // Update participant count
    await this.prisma.pilotProgram.update({
      where: { id: programId },
      data: {
        currentParticipants: {
          decrement: 1
        }
      }
    });

    this.logger.log(`User ${userId} left pilot program ${programId}`);
  }

  // Submit pilot feedback
  async submitPilotFeedback(
    programId: string,
    userId: string,
    feedback: Omit<PilotFeedback, "participantId" | "submittedAt">
  ): Promise<void> {
    const program = await this.prisma.pilotProgram.findFirst({
      where: { id: programId }
    });

    if (!program) {
      throw new Error("Pilot program not found");
    }

    // Check if user is a participant
    const participant = await this.prisma.pilotParticipant.findFirst({
      where: { programId, userId }
    });

    if (!participant) {
      throw new Error("User is not a participant in this pilot program");
    }

    // Create feedback
    await this.prisma.pilotFeedback.create({
      data: {
        programId,
        participantId: userId,
        rating: feedback.rating,
        comments: feedback.comments,
        suggestions: feedback.suggestions,
        submittedAt: new Date()
      }
    });

    // Update program metrics
    await this.updatePilotMetrics(programId);

    this.logger.log(`User ${userId} submitted feedback for pilot program ${programId}`);
  }

  // Get pilot metrics
  async getPilotMetrics(programId: string, tenantId: string): Promise<PilotMetrics> {
    const program = await this.prisma.pilotProgram.findFirst({
      where: { id: programId, tenantId },
      include: {
        participants: true,
        feedback: true
      }
    });

    if (!program) {
      throw new Error("Pilot program not found");
    }

    return this.calculatePilotMetrics(program);
  }

  // Start pilot program
  async startPilotProgram(programId: string, tenantId: string): Promise<void> {
    const program = await this.prisma.pilotProgram.findFirst({
      where: { id: programId, tenantId }
    });

    if (!program) {
      throw new Error("Pilot program not found");
    }

    if (program.status !== "PLANNING") {
      throw new Error("Pilot program is not in planning status");
    }

    await this.prisma.pilotProgram.update({
      where: { id: programId },
      data: {
        status: "ACTIVE"
      }
    });

    this.logger.log(`Started pilot program ${programId}`);
  }

  // Complete pilot program
  async completePilotProgram(programId: string, tenantId: string): Promise<void> {
    const program = await this.prisma.pilotProgram.findFirst({
      where: { id: programId, tenantId }
    });

    if (!program) {
      throw new Error("Pilot program not found");
    }

    if (program.status !== "ACTIVE") {
      throw new Error("Pilot program is not active");
    }

    // Update all participants to completed
    await this.prisma.pilotParticipant.updateMany({
      where: { programId, status: "ACTIVE" },
      data: {
        status: "COMPLETED",
        completedAt: new Date()
      }
    });

    // Update program status
    await this.prisma.pilotProgram.update({
      where: { id: programId },
      data: {
        status: "COMPLETED"
      }
    });

    // Update final metrics
    await this.updatePilotMetrics(programId);

    this.logger.log(`Completed pilot program ${programId}`);
  }

  // Get available pilot programs for user
  async getAvailablePilotPrograms(userId: string, tenantId: string): Promise<PilotProgram[]> {
    const programs = await this.prisma.pilotProgram.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        currentParticipants: {
          lt: this.prisma.pilotProgram.fields.maxParticipants
        }
      },
      include: {
        participants: {
          where: { userId }
        }
      }
    });

    // Filter out programs user is already participating in
    return programs
      .filter(program => program.participants.length === 0)
      .map(program => this.mapToPilotProgram(program));
  }

  // Private helper methods
  private async updatePilotMetrics(programId: string): Promise<void> {
    const program = await this.prisma.pilotProgram.findFirst({
      where: { id: programId },
      include: {
        participants: true,
        feedback: true
      }
    });

    if (!program) {
      return;
    }

    const metrics = this.calculatePilotMetrics(program);

    await this.prisma.pilotProgram.update({
      where: { id: programId },
      data: {
        metrics: metrics as any
      }
    });
  }

  private calculatePilotMetrics(program: any): PilotMetrics {
    const totalParticipants = program.participants.length;
    const activeParticipants = program.participants.filter((p: any) => p.status === "ACTIVE").length;
    const completedParticipants = program.participants.filter((p: any) => p.status === "COMPLETED").length;
    
    const completionRate = totalParticipants > 0 ? (completedParticipants / totalParticipants) * 100 : 0;
    
    const feedback = program.feedback || [];
    const satisfactionScore = feedback.length > 0 
      ? feedback.reduce((sum: number, f: any) => sum + f.rating, 0) / feedback.length 
      : 0;

    // Calculate feature usage (simplified)
    const featureUsage: Record<string, number> = {};
    program.features.forEach((feature: string) => {
      featureUsage[feature] = Math.floor(Math.random() * totalParticipants); // Mock data
    });

    return {
      totalParticipants,
      activeParticipants,
      completionRate,
      satisfactionScore,
      featureUsage,
      feedback: feedback.map((f: any) => ({
        participantId: f.participantId,
        rating: f.rating,
        comments: f.comments,
        suggestions: f.suggestions,
        submittedAt: f.submittedAt
      }))
    };
  }

  private mapToPilotProgram(program: any): PilotProgram {
    return {
      id: program.id,
      name: program.name,
      description: program.description,
      startDate: program.startDate,
      endDate: program.endDate,
      maxParticipants: program.maxParticipants,
      currentParticipants: program.currentParticipants,
      status: program.status,
      features: program.features,
      successCriteria: program.successCriteria,
      metrics: program.metrics,
      createdAt: program.createdAt
    };
  }
}
