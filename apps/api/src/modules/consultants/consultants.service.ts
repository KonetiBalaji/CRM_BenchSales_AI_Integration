import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { DedupeService } from "../dedupe/dedupe.service";
import { CreateConsultantDto, UpdateConsultantDto } from "./dto/consultant.dto";

@Injectable()
export class ConsultantsService {
  private readonly logger = new Logger(ConsultantsService.name);

  constructor(private readonly prisma: PrismaService, private readonly dedupe: DedupeService) {}

  async list(tenantId: string, search?: string, page = 1, limit = 50) {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new BadRequestException('Valid tenantId is required');
    }

    const sanitizedLimit = Math.min(Math.max(1, limit), 100);
    const sanitizedPage = Math.max(1, page);
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const sanitizedSearch = search?.trim().substring(0, 100);

    const [consultants, total] = await Promise.all([
      this.prisma.consultant.findMany({
        where: {
          tenantId,
          OR: sanitizedSearch
            ? [
                { firstName: { contains: sanitizedSearch, mode: "insensitive" } },
                { lastName: { contains: sanitizedSearch, mode: "insensitive" } },
                { email: { contains: sanitizedSearch, mode: "insensitive" } }
              ]
            : undefined
        },
        include: {
          skills: { include: { skill: true } },
          tags: true,
          documents: { include: { metadata: true } }
        },
        orderBy: [{ availability: "asc" }, { updatedAt: "desc" }],
        skip,
        take: sanitizedLimit
      }),
      this.prisma.consultant.count({
        where: {
          tenantId,
          OR: sanitizedSearch
            ? [
                { firstName: { contains: sanitizedSearch, mode: "insensitive" } },
                { lastName: { contains: sanitizedSearch, mode: "insensitive" } },
                { email: { contains: sanitizedSearch, mode: "insensitive" } }
              ]
            : undefined
        }
      })
    ]);

    return {
      data: consultants,
      pagination: {
        total,
        page: sanitizedPage,
        limit: sanitizedLimit,
        totalPages: Math.ceil(total / sanitizedLimit)
      }
    };
  }

  async get(tenantId: string, id: string) {
    if (!tenantId || !id) {
      throw new BadRequestException('Valid tenantId and id are required');
    }

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
      this.logger.warn(`Consultant not found: ${id} for tenant: ${tenantId}`);
      throw new NotFoundException(`Consultant ${id} not found`);
    }
    return consultant;
  }

  async create(dto: CreateConsultantDto) {
    if (!dto.email || !dto.tenantId) {
      throw new BadRequestException('Email and tenantId are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      throw new BadRequestException('Invalid email format');
    }

    const existingConsultant = await this.prisma.consultant.findFirst({
      where: { email: dto.email, tenantId: dto.tenantId }
    });

    if (existingConsultant) {
      throw new BadRequestException('Consultant with this email already exists');
    }

    try {
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

      this.logger.log(`Created consultant ${consultant.id} for tenant ${dto.tenantId}`);

      await this.dedupe.refreshConsultantSignatures(dto.tenantId, consultant.id);

      return consultant;
    } catch (error) {
      this.logger.error(`Failed to create consultant: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateConsultantDto) {
    const existing = await this.get(tenantId, id);

    if (dto.email && dto.email !== existing.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email)) {
        throw new BadRequestException('Invalid email format');
      }

      const existingEmail = await this.prisma.consultant.findFirst({
        where: { email: dto.email, tenantId, id: { not: id } }
      });

      if (existingEmail) {
        throw new BadRequestException('Another consultant with this email already exists');
      }
    }

    try {
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

      this.logger.log(`Updated consultant ${id} for tenant ${tenantId}`);

      await this.dedupe.refreshConsultantSignatures(tenantId, result.id);

      return result;
    } catch (error) {
      this.logger.error(`Failed to update consultant ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
