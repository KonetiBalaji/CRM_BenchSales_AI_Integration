import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, SubmissionStatus } from "@prisma/client";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateSubmissionDto } from "./dto/submission.dto";

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, status?: SubmissionStatus) {
    return this.prisma.submission.findMany({
      where: { tenantId, status: status ?? undefined },
      include: {
        consultant: true,
        requirement: true,
        interviews: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(tenantId: string, dto: CreateSubmissionDto) {
    const data: Prisma.SubmissionCreateInput = {
      tenant: { connect: { id: tenantId } },
      consultant: { connect: { id: dto.consultantId } },
      requirement: { connect: { id: dto.requirementId } },
      status: dto.status,
      notes: dto.notes ? (dto.notes as Prisma.InputJsonValue) : undefined,
      interviews: dto.interviews
        ? {
            create: dto.interviews.map((interview) => ({
              tenant: { connect: { id: tenantId } },
              scheduledAt: new Date(interview.scheduledAt),
              interviewer: interview.interviewer,
              mode: interview.mode
            }))
          }
        : undefined
    };

    return this.prisma.submission.create({
      data,
      include: { consultant: true, requirement: true, interviews: true }
    });
  }

  async updateStatus(tenantId: string, id: string, status: SubmissionStatus) {
    const submission = await this.prisma.submission.findFirst({ where: { id, tenantId } });
    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }

    return this.prisma.submission.update({
      where: { id },
      data: { status },
      include: { consultant: true, requirement: true, interviews: true }
    });
  }
}
