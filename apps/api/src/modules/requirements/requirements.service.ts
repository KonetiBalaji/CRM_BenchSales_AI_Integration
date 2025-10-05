import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateRequirementDto, UpdateRequirementDto } from "./dto/requirement.dto";

@Injectable()
export class RequirementsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, status?: string) {
    return this.prisma.requirement.findMany({
      where: {
        tenantId,
        status: status ? (status as any) : undefined
      },
      include: {
        skills: { include: { skill: true } },
        matches: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async get(tenantId: string, id: string) {
    const requirement = await this.prisma.requirement.findFirst({
      where: { tenantId, id },
      include: {
        skills: { include: { skill: true } },
        matches: {
          include: {
            consultant: true
          }
        }
      }
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement ${id} not found`);
    }

    return requirement;
  }

  create(dto: CreateRequirementDto) {
    const data: Prisma.RequirementCreateInput = {
      tenant: { connect: { id: dto.tenantId } },
      title: dto.title,
      clientName: dto.clientName,
      description: dto.description,
      location: dto.location,
      type: dto.type,
      status: dto.status,
      source: dto.source,
      minRate: dto.minRate ? new Prisma.Decimal(dto.minRate) : undefined,
      maxRate: dto.maxRate ? new Prisma.Decimal(dto.maxRate) : undefined,
      closesAt: dto.closesAt ? new Date(dto.closesAt) : undefined,
      skills: {
        create: dto.skills?.map((skill) => ({
          tenant: { connect: { id: dto.tenantId } },
          skill: { connect: { id: skill.id } },
          weight: skill.weight
        }))
      }
    };

    return this.prisma.requirement.create({
      data,
      include: { skills: { include: { skill: true } } }
    });
  }

  async update(tenantId: string, id: string, dto: UpdateRequirementDto) {
    await this.get(tenantId, id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.skills) {
        await tx.requirementSkill.deleteMany({ where: { requirementId: id, tenantId } });
        await tx.requirementSkill.createMany({
          data: dto.skills.map((skill) => ({
            tenantId,
            requirementId: id,
            skillId: skill.id,
            weight: skill.weight
          }))
        });
      }

      const data: Prisma.RequirementUpdateInput = {
        title: dto.title,
        clientName: dto.clientName,
        description: dto.description,
        location: dto.location,
        type: dto.type,
        status: dto.status,
        source: dto.source,
        minRate: dto.minRate ? new Prisma.Decimal(dto.minRate) : undefined,
        maxRate: dto.maxRate ? new Prisma.Decimal(dto.maxRate) : undefined,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : undefined
      };

      return tx.requirement.update({
        where: { id },
        data,
        include: { skills: { include: { skill: true } } }
      });
    });
  }
}
