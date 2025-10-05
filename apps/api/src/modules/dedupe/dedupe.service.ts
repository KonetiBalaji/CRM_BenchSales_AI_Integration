import { Injectable } from "@nestjs/common";
import { IdentityClusterStatus, IdentitySignatureType } from "@prisma/client";
import { createHash } from "crypto";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";

export interface DuplicateMatch {
  consultantId: string;
  consultant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  matchTypes: IdentitySignatureType[];
  sharedSignatureCount: number;
}

export interface DuplicateCluster {
  signature: { type: IdentitySignatureType; valueHash: string };
  consultants: DuplicateMatch[];
}

@Injectable()
export class DedupeService {
  constructor(private readonly prisma: PrismaService) {}

  async refreshConsultantSignatures(tenantId: string, consultantId: string): Promise<void> {
    const consultant = await this.prisma.consultant.findFirst({
      where: { id: consultantId, tenantId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true
      }
    });

    if (!consultant) {
      return;
    }

    const desired = new Map<string, { type: IdentitySignatureType; hash: string; raw: string }>();

    if (consultant.email) {
      const normalized = consultant.email.trim().toLowerCase();
      desired.set(`email:${normalized}`, {
        type: IdentitySignatureType.EMAIL,
        hash: this.hashValue(normalized),
        raw: consultant.email
      });
    }

    if (consultant.phone) {
      const normalized = consultant.phone.replace(/[^0-9]/g, "");
      if (normalized) {
        desired.set(`phone:${normalized}`, {
          type: IdentitySignatureType.PHONE,
          hash: this.hashValue(normalized),
          raw: consultant.phone
        });
      }
    }

    const nameParts = [consultant.firstName, consultant.lastName].filter((value): value is string => Boolean(value));
    if (nameParts.length > 0) {
      const normalized = nameParts.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
      desired.set(`name:${normalized}`, {
        type: IdentitySignatureType.NAME,
        hash: this.hashValue(normalized),
        raw: normalized
      });
    }

    const existing = await this.prisma.identitySignature.findMany({ where: { tenantId, consultantId } });
    const desiredValues = new Set(Array.from(desired.values()).map((value) => `${value.type}:${value.hash}`));

    const removals = existing.filter((signature) => !desiredValues.has(`${signature.type}:${signature.valueHash}`));
    if (removals.length > 0) {
      await this.prisma.identitySignature.deleteMany({ where: { id: { in: removals.map((item) => item.id) } } });
    }

    for (const value of desired.values()) {
      await this.prisma.identitySignature.upsert({
        where: {
          tenantId_type_valueHash_consultantId: {
            tenantId,
            type: value.type,
            valueHash: value.hash,
            consultantId
          }
        },
        create: {
          tenantId,
          consultantId,
          type: value.type,
          valueHash: value.hash,
          rawValue: value.raw
        },
        update: {
          rawValue: value.raw
        }
      });
    }
  }

  async findPotentialDuplicates(tenantId: string, consultantId: string): Promise<DuplicateMatch[]> {
    const signatures = await this.prisma.identitySignature.findMany({
      where: { tenantId, consultantId }
    });

    if (signatures.length === 0) {
      return [];
    }

    const matches = await this.prisma.identitySignature.findMany({
      where: {
        tenantId,
        type: { in: signatures.map((signature) => signature.type) },
        valueHash: { in: signatures.map((signature) => signature.valueHash) },
        consultantId: { not: consultantId }
      },
      include: {
        consultant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    const grouped = new Map<string, DuplicateMatch>();
    for (const match of matches) {
      const existing = grouped.get(match.consultantId);
      if (existing) {
        existing.matchTypes.push(match.type);
        existing.sharedSignatureCount += 1;
      } else if (match.consultant) {
        grouped.set(match.consultantId, {
          consultantId: match.consultantId,
          consultant: match.consultant,
          matchTypes: [match.type],
          sharedSignatureCount: 1
        });
      }
    }

    return Array.from(grouped.values()).sort((a, b) => b.sharedSignatureCount - a.sharedSignatureCount);
  }

  async findTenantDuplicateCandidates(tenantId: string, limit = 5): Promise<DuplicateCluster[]> {
    const groups = await this.prisma.identitySignature.groupBy({
      by: ["valueHash", "type"],
      where: { tenantId },
      _count: { consultantId: true },
      having: {
        consultantId: {
          _count: { gt: 1 }
        }
      },
      orderBy: {
        _count: { consultantId: "desc" }
      },
      take: limit * 3
    });

    if (groups.length === 0) {
      return [];
    }

    const signatures = await this.prisma.identitySignature.findMany({
      where: {
        tenantId,
        OR: groups.map((group) => ({ type: group.type, valueHash: group.valueHash }))
      },
      include: {
        consultant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    const clusters = new Map<string, DuplicateCluster>();
    for (const group of groups) {
      const key = `${group.type}:${group.valueHash}`;
      const participants = signatures.filter((signature) => signature.type === group.type && signature.valueHash === group.valueHash);
      const matches: DuplicateMatch[] = participants
        .filter((signature) => signature.consultant != null)
        .map((signature) => ({
          consultantId: signature.consultantId,
          consultant: signature.consultant!,
          matchTypes: [signature.type],
          sharedSignatureCount: 1
        }));
      if (matches.length > 1) {
        clusters.set(key, {
          signature: { type: group.type, valueHash: group.valueHash },
          consultants: matches
        });
      }
    }

    return Array.from(clusters.values()).slice(0, limit);
  }

  private hashValue(input: string): string {
    return createHash("sha256").update(input).digest("hex");
  }
}
