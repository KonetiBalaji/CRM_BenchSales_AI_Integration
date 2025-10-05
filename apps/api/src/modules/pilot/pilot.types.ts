export interface PilotProgram {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  maxParticipants: number;
  currentParticipants: number;
  status: PilotStatus;
  features: string[];
  successCriteria: string[];
  metrics: PilotMetrics;
  createdAt: Date;
}

export interface PilotMetrics {
  totalParticipants: number;
  activeParticipants: number;
  completionRate: number;
  satisfactionScore: number;
  featureUsage: Record<string, number>;
  feedback: PilotFeedback[];
}

export interface PilotFeedback {
  participantId: string;
  rating: number;
  comments: string;
  suggestions: string[];
  submittedAt: Date;
}

export interface PilotParticipant {
  id: string;
  programId: string;
  userId: string;
  joinedAt: Date;
  status: PilotParticipantStatus;
  leftAt?: Date;
  completedAt?: Date;
}

export enum PilotStatus {
  PLANNING = "PLANNING",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

export enum PilotParticipantStatus {
  ACTIVE = "ACTIVE",
  LEFT = "LEFT",
  COMPLETED = "COMPLETED"
}
