import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, RequirementStatus, SubmissionStatus, UserRole } from "@prisma/client";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

type RequirementTransition = {
  from: RequirementStatus[];
  to: RequirementStatus;
};

type SubmissionTransition = {
  from: SubmissionStatus[];
  to: SubmissionStatus;
};

const REQ_FSM: RequirementTransition[] = [
  { from: ["OPEN"], to: "IN_PROGRESS" },
  { from: ["IN_PROGRESS"], to: "ON_HOLD" },
  { from: ["IN_PROGRESS", "ON_HOLD"], to: "CLOSED" }
] as const;

const SUB_FSM: SubmissionTransition[] = [
  { from: ["DRAFT"], to: "SUBMITTED" },
  { from: ["SUBMITTED"], to: "INTERVIEW" },
  { from: ["INTERVIEW"], to: "OFFER" },
  { from: ["OFFER"], to: "HIRED" },
  { from: ["SUBMITTED", "INTERVIEW", "OFFER"], to: "LOST" }
] as const;

@Injectable()
export class WorkflowService {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async transitionRequirement(tenantId: string, id: string, to: RequirementStatus, actor?: { id?: string; role?: UserRole }) {
    const req = await this.prisma.requirement.findFirst({ where: { id, tenantId } });
    if (!req) throw new NotFoundException("Requirement not found");
    const allowed = REQ_FSM.find((t) => t.to === to && t.from.includes(req.status));
    if (!allowed) throw new Error(`Invalid transition ${req.status} -> ${to}`);

    const updated = await this.prisma.requirement.update({ where: { id }, data: { status: to } });
    await this.recordAudit(tenantId, actor?.id, actor?.role, `Requirement status: ${req.status} -> ${to}`, "Requirement", id);
    await this.notifications.notify(tenantId, {
      subject: `Requirement ${updated.title} is now ${to}`,
      body: `Requirement ${updated.id} transitioned to ${to}`
    });
    return updated;
  }

  async transitionSubmission(tenantId: string, id: string, to: SubmissionStatus, actor?: { id?: string; role?: UserRole }) {
    const sub = await this.prisma.submission.findFirst({ where: { id, tenantId } });
    if (!sub) throw new NotFoundException("Submission not found");
    const allowed = SUB_FSM.find((t) => t.to === to && t.from.includes(sub.status));
    if (!allowed) throw new Error(`Invalid transition ${sub.status} -> ${to}`);

    const updated = await this.prisma.submission.update({ where: { id }, data: { status: to } });
    await this.recordAudit(tenantId, actor?.id, actor?.role, `Submission status: ${sub.status} -> ${to}`, "Submission", id);
    await this.notifications.notify(tenantId, {
      subject: `Submission ${updated.id} is now ${to}`,
      body: `Submission transitioned to ${to}`
    });
    return updated;
  }

  async addComment(tenantId: string, entity: "requirement" | "submission", entityId: string, text: string, author?: string) {
    // Store as an audit log entry with type comment
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: author ?? null,
        action: "COMMENT",
        entityType: entity,
        entityId,
        payload: { text } as Prisma.InputJsonValue,
        hash: ""
      }
    });
    return { status: "ok" };
  }

  scheduleEscalation(tenantId: string, key: string, delayMs: number, payload: { subject: string; body: string }) {
    const timerKey = `${tenantId}:${key}`;
    clearTimeout(this.timers.get(timerKey) ?? (null as any));
    const handle = setTimeout(async () => {
      await this.notifications.notify(tenantId, payload);
      this.timers.delete(timerKey);
    }, delayMs);
    this.timers.set(timerKey, handle);
    return { scheduledInMs: delayMs };
  }

  private async recordAudit(tenantId: string, userId: string | undefined, role: UserRole | undefined, action: string, entityType: string, entityId: string) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? null,
        actorRole: role ?? null,
        action,
        entityType,
        entityId,
        payload: Prisma.JsonNull,
        hash: ""
      }
    });
  }
}



