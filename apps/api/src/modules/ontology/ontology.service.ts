import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateOntologyVersionDto, OntologySkillDto, UpsertSkillOntologyDto } from "./dto/upsert-skill-ontology.dto";

@Injectable()
export class OntologyService {
  constructor(private readonly prisma: PrismaService) {}

  async listNodes(versionLabel?: string, search?: string, limit = 100) {
    const version = await this.resolveVersion(versionLabel);
    if (!version) {
      return [];
    }

    return this.prisma.skillOntologyNode.findMany({
      where: {
        versionId: version.id,
        OR: search
          ? [
              { canonicalName: { contains: search, mode: "insensitive" } },
              { aliases: { some: { value: { contains: search, mode: "insensitive" } } } }
            ]
          : undefined
      },
      include: { aliases: true },
      orderBy: { canonicalName: "asc" },
      take: limit
    });
  }

  async upsertSkills(payload: UpsertSkillOntologyDto) {
    const version = await this.ensureVersion(payload);

    for (const skill of payload.skills) {
      await this.upsertSkillNode(version.id, skill);
    }

    if (payload.activate) {
      await this.setActiveVersion(version.id);
    }

    return this.listNodes(version.version, undefined, 200);
  }

  async createVersion(payload: CreateOntologyVersionDto) {
    const existing = await this.prisma.skillOntologyVersion.findUnique({ where: { version: payload.version } });
    if (existing) {
      throw new BadRequestException(`Ontology version ${payload.version} already exists`);
    }

    const version = await this.prisma.skillOntologyVersion.create({
      data: {
        version: payload.version,
        source: payload.source,
        revisionNotes: payload.revisionNotes,
        isActive: payload.activate ?? false
      }
    });

    if (payload.activate) {
      await this.setActiveVersion(version.id);
    }

    return version;
  }

  async getActiveVersion() {
    return this.prisma.skillOntologyVersion.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async setActiveVersion(versionId: string) {
    await this.prisma.$transaction([
      this.prisma.skillOntologyVersion.updateMany({ data: { isActive: false } }),
      this.prisma.skillOntologyVersion.update({ where: { id: versionId }, data: { isActive: true, publishedAt: new Date() } })
    ]);
  }

  async activateVersionByLabel(versionLabel: string) {
    const version = await this.prisma.skillOntologyVersion.findUnique({ where: { version: versionLabel } });
    if (!version) {
      throw new NotFoundException(`Ontology version ${versionLabel} not found`);
    }
    await this.setActiveVersion(version.id);
    return version;
  }

  async getCoverageSummary() {
    const activeVersion = await this.getActiveVersion();
    if (!activeVersion) {
      return {
        activeVersion: null,
        canonicalSkillCount: 0,
        aliasCount: 0,
        linkedSkillCount: 0,
        coverageTarget: 500,
        coverageRatio: 0
      };
    }

    const [canonicalSkillCount, aliasCount, linkedSkillCount] = await Promise.all([
      this.prisma.skillOntologyNode.count({ where: { versionId: activeVersion.id } }),
      this.prisma.skillOntologyAlias.count({ where: { node: { versionId: activeVersion.id } } }),
      this.prisma.skill.count({ where: { ontologyNodeId: { not: null } } })
    ]);

    const coverageTarget = 500;
    const coverageRatio = coverageTarget > 0 ? Math.min(linkedSkillCount / coverageTarget, 1) : 0;

    return {
      activeVersion,
      canonicalSkillCount,
      aliasCount,
      linkedSkillCount,
      coverageTarget,
      coverageRatio
    };
  }

  private async ensureVersion(payload: UpsertSkillOntologyDto) {
    const existing = await this.prisma.skillOntologyVersion.findUnique({ where: { version: payload.version } });
    if (existing) {
      return this.prisma.skillOntologyVersion.update({
        where: { id: existing.id },
        data: {
          source: payload.source,
          revisionNotes: payload.revisionNotes ?? existing.revisionNotes
        }
      });
    }

    return this.prisma.skillOntologyVersion.create({
      data: {
        version: payload.version,
        source: payload.source,
        revisionNotes: payload.revisionNotes ?? undefined,
        isActive: payload.activate ?? false
      }
    });
  }

  private async resolveVersion(versionLabel?: string) {
    if (versionLabel) {
      return this.prisma.skillOntologyVersion.findUnique({ where: { version: versionLabel } });
    }
    return this.getActiveVersion();
  }

  private async upsertSkillNode(versionId: string, skill: OntologySkillDto) {
    const canonicalName = skill.canonicalName.trim();
    const node = await this.prisma.skillOntologyNode.upsert({
      where: {
        versionId_canonicalName: {
          versionId,
          canonicalName
        }
      },
      create: {
        versionId,
        canonicalName,
        code: skill.code?.trim() ?? null,
        category: skill.category?.trim() ?? null,
        description: skill.description ?? null,
        tags: skill.tags ?? []
      },
      update: {
        code: skill.code?.trim() ?? null,
        category: skill.category?.trim() ?? null,
        description: skill.description ?? null,
        tags: skill.tags ?? []
      }
    });

    const aliasValues = new Set<string>();
    for (const alias of skill.aliases) {
      const value = alias.value.trim().toLowerCase();
      aliasValues.add(value);
      await this.prisma.skillOntologyAlias.upsert({
        where: {
          nodeId_value: {
            nodeId: node.id,
            value
          }
        },
        create: {
          nodeId: node.id,
          value,
          locale: alias.locale ?? null,
          matchType: alias.matchType ?? undefined,
          confidence: alias.confidence ?? null
        },
        update: {
          locale: alias.locale ?? null,
          matchType: alias.matchType ?? undefined,
          confidence: alias.confidence ?? null
        }
      });
    }

    await this.prisma.skillOntologyAlias.deleteMany({
      where: {
        nodeId: node.id,
        value: { notIn: Array.from(aliasValues) }
      }
    });

    await this.prisma.skill.upsert({
      where: { name: canonicalName },
      update: {
        category: skill.category ?? undefined,
        ontologyNodeId: node.id
      },
      create: {
        name: canonicalName,
        category: skill.category ?? null,
        ontologyNodeId: node.id
      }
    });
  }
}
