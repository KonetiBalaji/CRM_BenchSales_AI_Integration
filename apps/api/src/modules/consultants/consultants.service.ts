import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { DedupeService } from "../dedupe/dedupe.service";
import { CreateConsultantDto, UpdateConsultantDto } from "./dto/consultant.dto";

@Injectable()
export class ConsultantsService {
  constructor(private readonly prisma: PrismaService, private readonly dedupe: DedupeService) {}

  list(tenantId: string, search?: string) {
    return this.prisma.consultant.findMany({
      where: {
        tenantId,
        OR: search
          ? [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } }
            ]
          : undefined
      },
      include: {
        skills: { include: { skill: true } },
        tags: true,
        documents: { include: { metadata: true } }
      },
      orderBy: [{ availability: "asc" }, { updatedAt: "desc" }]
    });
  }

  async get(tenantId: string, id: string) {
    const consultant = await this.prisma.consultant.findFirst({
      where: { id, tenantId },
      include: {
        skills: { include: { skill: true } },
        tags: true,
        submissions: true,
        documents: { include: { metadata: true } }
      }
    });

    if (!consultant) {
      throw new NotFoundException(`Consultant ${id} not found`);
    }
    return consultant;
  }

  async create(dto: CreateConsultantDto) {
    const data: Prisma.ConsultantCreateInput = {
      tenant: { connect: { id: dto.tenantId } },
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      location: dto.location,
      availability: dto.availability,
      rate: dto.rate ? new Prisma.Decimal(dto.rate) : undefined,
      experience: dto.experience ? new Prisma.Decimal(dto.experience) : undefined,
      summary: dto.summary,
      skills: {
        create: dto.skills?.map((skill) => ({
          tenant: { connect: { id: dto.tenantId } },
          skill: { connect: { id: skill.id } },
          weight: skill.weight
        }))
      }
    };

    const consultant = await this.prisma.consultant.create({
      data,
      include: { skills: { include: { skill: true } }, documents: { include: { metadata: true } } }
    });

    await this.dedupe.refreshConsultantSignatures(dto.tenantId, consultant.id);

    return consultant;
  }

  async update(tenantId: string, id: string, dto: UpdateConsultantDto) {
    const existing = await this.get(tenantId, id);
    const data: Prisma.ConsultantUpdateInput = {
      firstName: dto.firstName ?? existing.firstName,
      lastName: dto.lastName ?? existing.lastName,
      email: dto.email ?? existing.email,
      phone: dto.phone ?? existing.phone,
      location: dto.location ?? existing.location,
      availability: dto.availability ?? existing.availability,
      rate: dto.rate ? new Prisma.Decimal(dto.rate) : undefined,
      experience: dto.experience ? new Prisma.Decimal(dto.experience) : undefined,
      summary: dto.summary ?? existing.summary
    };

    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.skills) {
        await tx.consultantSkill.deleteMany({ where: { consultantId: id, tenantId } });
        await tx.consultantSkill.createMany({
          data: dto.skills.map((skill) => ({
            tenantId,
            consultantId: id,
            skillId: skill.id,
            weight: skill.weight
          }))
        });
      }

      return tx.consultant.update({
        where: { id },
        data,
        include: { skills: { include: { skill: true } }, documents: { include: { metadata: true } } }
      });
    });

    await this.dedupe.refreshConsultantSignatures(tenantId, result.id);

    return result;
  }
}
