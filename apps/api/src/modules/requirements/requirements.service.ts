import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateRequirementDto, UpdateRequirementDto } from "./dto/requirement.dto";

@Injectable()
export class RequirementsService {
  private readonly logger = new Logger(RequirementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, status?: string, page = 1, limit = 50) {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new BadRequestException('Valid tenantId is required');
    }

    const sanitizedLimit = Math.min(Math.max(1, limit), 100);
    const sanitizedPage = Math.max(1, page);
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'FILLED', 'CLOSED'];
    const sanitizedStatus = status && validStatuses.includes(status.toUpperCase()) 
      ? status.toUpperCase() 
      : undefined;

    const [requirements, total] = await Promise.all([
      this.prisma.requirement.findMany({
        where: {
          tenantId,
          status: sanitizedStatus as any
        },
        include: {
          skills: { include: { skill: true } },
          matches: true
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: sanitizedLimit
      }),
      this.prisma.requirement.count({
        where: {
          tenantId,
          status: sanitizedStatus as any
        }
      })
    ]);

    return {
      data: requirements,
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
      this.logger.warn(`Requirement not found: ${id} for tenant: ${tenantId}`);
      throw new NotFoundException(`Requirement ${id} not found`);
    }

    return requirement;
  }

  async create(dto: CreateRequirementDto) {
    if (!dto.title || !dto.tenantId) {
      throw new BadRequestException('Title and tenantId are required');
    }

    if (dto.title.length > 200) {
      throw new BadRequestException('Title must be less than 200 characters');
    }

    if (dto.minRate && dto.maxRate && dto.minRate > dto.maxRate) {
      throw new BadRequestException('Minimum rate cannot be greater than maximum rate');
    }

    try {
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

      const requirement = await this.prisma.requirement.create({
        data,
        include: { skills: { include: { skill: true } } }
      });

      this.logger.log(`Created requirement ${requirement.id} for tenant ${dto.tenantId}`);

      return requirement;
    } catch (error) {
      this.logger.error(`Failed to create requirement: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateRequirementDto) {
    await this.get(tenantId, id);

    if (dto.title && dto.title.length > 200) {
      throw new BadRequestException('Title must be less than 200 characters');
    }

    if (dto.minRate && dto.maxRate && dto.minRate > dto.maxRate) {
      throw new BadRequestException('Minimum rate cannot be greater than maximum rate');
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
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

      this.logger.log(`Updated requirement ${id} for tenant ${tenantId}`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to update requirement ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
