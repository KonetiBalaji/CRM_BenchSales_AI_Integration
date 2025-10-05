import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, SearchEntityType } from "@prisma/client";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { EmbeddingService } from "./embedding.service";
import type { HybridSearchRequestDto } from "./dto/hybrid-search.dto";
import type { BulkIndexRequestDto, IndexEntityRequestDto } from "./dto/index-request.dto";

interface HybridSearchQueryResult {
  id: string;
  entityType: SearchEntityType;
  entityId: string;
  content: string;
  metadata: Prisma.JsonValue | null;
  vector_score: number | null;
  lexical_score: number | null;
  total_score: number | null;
}

export interface HybridSearchResult {
  id: string;
  entityType: SearchEntityType;
  entityId: string;
  content: string;
  metadata: Prisma.JsonValue | null;
  vectorScore: number;
  lexicalScore: number;
  score: number;
}

interface SearchConfig {
  vectorWeight: number;
  lexicalWeight: number;
  maxResults: number;
}

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);
  private readonly vectorWeight: number;
  private readonly lexicalWeight: number;
  private readonly maxResults: number;
  private readonly embeddingDimensions: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly configService: ConfigService
  ) {
    const searchConfig = this.configService.get<SearchConfig>("search") ?? {
      vectorWeight: 0.6,
      lexicalWeight: 0.4,
      maxResults: 20
    };
    this.vectorWeight = searchConfig.vectorWeight;
    this.lexicalWeight = searchConfig.lexicalWeight;
    this.maxResults = searchConfig.maxResults;
    this.embeddingDimensions = this.embeddingService.getEmbeddingDimensions();
  }

  async indexEntity(tenantId: string, payload: IndexEntityRequestDto): Promise<void> {
    switch (payload.entityType) {
      case SearchEntityType.CONSULTANT:
        await this.indexConsultant(tenantId, payload.entityId);
        break;
      case SearchEntityType.REQUIREMENT:
        await this.indexRequirement(tenantId, payload.entityId);
        break;
      default:
        throw new NotFoundException(`Unsupported entity type ${payload.entityType}`);
    }
  }

  async bulkIndex(tenantId: string, payload: BulkIndexRequestDto = {}): Promise<number> {
    let indexed = 0;

    if (!payload.entityType || payload.entityType === SearchEntityType.CONSULTANT) {
      const consultants = await this.prisma.consultant.findMany({ where: { tenantId }, select: { id: true } });
      for (const consultant of consultants) {
        await this.indexConsultant(tenantId, consultant.id);
      }
      indexed += consultants.length;
      if (payload.entityType === SearchEntityType.CONSULTANT) {
        return indexed;
      }
    }

    if (!payload.entityType || payload.entityType === SearchEntityType.REQUIREMENT) {
      const requirements = await this.prisma.requirement.findMany({ where: { tenantId }, select: { id: true } });
      for (const requirement of requirements) {
        await this.indexRequirement(tenantId, requirement.id);
      }
      indexed += requirements.length;
    }

    return indexed;
  }

  async indexConsultant(tenantId: string, consultantId: string): Promise<void> {
    const consultant = await this.prisma.consultant.findFirst({
      where: { id: consultantId, tenantId },
      include: {
        skills: { include: { skill: true } },
        tags: true,
        documents: true
      }
    });

    if (!consultant) {
      throw new NotFoundException(`Consultant ${consultantId} not found for tenant ${tenantId}`);
    }

    const metadata: Prisma.JsonObject = {
      type: "consultant",
      availability: consultant.availability,
      location: consultant.location,
      rate: consultant.rate ? Number(consultant.rate) : null,
      skills: consultant.skills.map((item) => item.skill?.name ?? ""),
      tags: consultant.tags.map((tag) => tag.value),
      documents: consultant.documents.length,
      updatedAt: consultant.updatedAt?.toISOString?.() ?? new Date().toISOString()
    };

    const contentParts: string[] = [
      `${consultant.firstName ?? ""} ${consultant.lastName ?? ""}`.trim(),
      consultant.summary ?? "",
      consultant.skills
        .map((item) => item.skill?.name ?? "")
        .filter(Boolean)
        .join(", "),
      consultant.tags.map((tag) => tag.value).join(", ")
    ].filter(Boolean);

    const content = contentParts.join("\n");
    const embedding = await this.embedText(content);

    await this.upsertSearchDocument(tenantId, SearchEntityType.CONSULTANT, consultant.id, content, metadata, embedding);
  }

  async indexRequirement(tenantId: string, requirementId: string): Promise<void> {
    const requirement = await this.prisma.requirement.findFirst({
      where: { id: requirementId, tenantId },
      include: {
        skills: { include: { skill: true } }
      }
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement ${requirementId} not found for tenant ${tenantId}`);
    }

    const metadata: Prisma.JsonObject = {
      type: "requirement",
      status: requirement.status,
      location: requirement.location,
      rateRange: [
        requirement.minRate ? Number(requirement.minRate) : null,
        requirement.maxRate ? Number(requirement.maxRate) : null
      ],
      skills: requirement.skills.map((item) => item.skill?.name ?? ""),
      postedAt: requirement.postedAt?.toISOString?.(),
      closesAt: requirement.closesAt?.toISOString?.()
    };

    const contentParts: string[] = [
      requirement.title,
      requirement.clientName,
      requirement.description,
      requirement.skills
        .map((item) => item.skill?.name ?? "")
        .filter(Boolean)
        .join(", ")
    ].filter(Boolean);

    const content = contentParts.join("\n");
    const embedding = await this.embedText(content);

    await this.upsertSearchDocument(tenantId, SearchEntityType.REQUIREMENT, requirement.id, content, metadata, embedding);
  }

  async hybridSearch(tenantId: string, payload: HybridSearchRequestDto): Promise<HybridSearchResult[]> {
    const limit = Math.min(payload.limit ?? this.maxResults, 100);
    const entityTypes = payload.entityTypes?.length ? payload.entityTypes : [SearchEntityType.CONSULTANT, SearchEntityType.REQUIREMENT];

    const filters: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    filters.push(`"tenantId" = $${paramIndex}`);
    params.push(tenantId);
    paramIndex += 1;

    if (entityTypes.length === 1) {
      filters.push(`"entityType" = $${paramIndex}::"SearchEntityType"`);
      params.push(entityTypes[0]);
      paramIndex += 1;
    } else {
      filters.push(`"entityType" = ANY($${paramIndex}::"SearchEntityType"[])`);
      params.push(entityTypes);
      paramIndex += 1;
    }

    const queryText = payload.query.trim();
    let tsQueryParamIndex: number | null = null;
    if (queryText.length > 0) {
      tsQueryParamIndex = paramIndex;
      filters.push(`plainto_tsquery('english', $${paramIndex}) @@ "searchVector"`);
      params.push(queryText);
      paramIndex += 1;
    }

    if (payload.filters?.location) {
      filters.push(`coalesce(metadata->>'location', '') ILIKE $${paramIndex}`);
      params.push(`%${payload.filters.location}%`);
      paramIndex += 1;
    }

    if (payload.filters?.skills?.length) {
      filters.push(`metadata->'skills' \?& $${paramIndex}`);
      params.push(payload.filters.skills);
      paramIndex += 1;
    }

    if (typeof payload.filters?.maxRate === "number") {
      filters.push(`(metadata->'rateRange'->>1)::numeric <= $${paramIndex}`);
      params.push(payload.filters.maxRate);
      paramIndex += 1;
    }

    const embedding = await this.embedText(queryText || " ");
    const embeddingLiteral = this.vectorLiteral(embedding);
    const vectorScoreExpr = this.embeddingService.isEnabled()
      ? `(1 - ("embedding" <=> ${embeddingLiteral}::vector))`
      : "0";
    const lexicalScoreExpr = tsQueryParamIndex
      ? `ts_rank_cd("searchVector", plainto_tsquery('english', $${tsQueryParamIndex}))`
      : "0";
    const totalScoreExpr = `(${this.vectorWeight} * ${vectorScoreExpr} + ${this.lexicalWeight} * ${lexicalScoreExpr})`;

    const limitParamIndex = paramIndex;
    params.push(limit);

    const sql = `
      SELECT "id", "entityType", "entityId", "content", "metadata",
             ${vectorScoreExpr} AS vector_score,
             ${lexicalScoreExpr} AS lexical_score,
             ${totalScoreExpr} AS total_score
      FROM "SearchDocument"
      WHERE ${filters.join(" AND ")}
      ORDER BY total_score DESC
      LIMIT $${limitParamIndex};
    `;

    const rows = (await this.prisma.$queryRawUnsafe(sql, ...params)) as HybridSearchQueryResult[];

    return rows.map((row) => ({
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      content: row.content,
      metadata: row.metadata,
      vectorScore: Number(row.vector_score ?? 0),
      lexicalScore: Number(row.lexical_score ?? 0),
      score: Number(row.total_score ?? 0)
    }));
  }

  private async embedText(text: string): Promise<number[]> {
    const trimmed = text.trim();
    if (!this.embeddingService.isEnabled() || trimmed.length === 0) {
      return new Array(this.embeddingDimensions).fill(0);
    }

    try {
      return await this.embeddingService.generateEmbedding(trimmed);
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${(error as Error).message}`);
      return new Array(this.embeddingDimensions).fill(0);
    }
  }

  private async upsertSearchDocument(
    tenantId: string,
    entityType: SearchEntityType,
    entityId: string,
    content: string,
    metadata: Prisma.JsonValue,
    embedding: number[]
  ): Promise<void> {
    const embeddingLiteral = this.vectorLiteral(embedding);
    const sql = `
      INSERT INTO "SearchDocument" ("tenantId", "entityType", "entityId", "content", "metadata", "searchVector", "embedding")
      VALUES ($1, $2::"SearchEntityType", $3, $4, $5::jsonb, to_tsvector('english', $4), ${embeddingLiteral}::vector)
      ON CONFLICT ("tenantId", "entityType", "entityId")
      DO UPDATE SET
        "content" = EXCLUDED."content",
        "metadata" = EXCLUDED."metadata",
        "searchVector" = EXCLUDED."searchVector",
        "embedding" = EXCLUDED."embedding",
        "updatedAt" = NOW();
    `;

    await this.prisma.$executeRawUnsafe(sql, tenantId, entityType, entityId, content, JSON.stringify(metadata ?? {}));
  }

  private vectorLiteral(vector: number[]): string {
    const normalized = vector.length === this.embeddingDimensions
      ? vector
      : vector.length > this.embeddingDimensions
        ? vector.slice(0, this.embeddingDimensions)
        : [...vector, ...new Array(this.embeddingDimensions - vector.length).fill(0)];

    const formatted = normalized.map((value) => (Number.isFinite(value) ? value.toFixed(6) : "0"));
    return `'[${formatted.join(",")}]'`;
  }
}

