import { Injectable } from "@nestjs/common";
import { IdentityClusterStatus, PiiScanStatus } from "@prisma/client";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { DocumentsService } from "../documents/documents.service";
import { DedupeService } from "../dedupe/dedupe.service";
import type { DuplicateCluster } from "../dedupe/dedupe.service";
import { OntologyService } from "../ontology/ontology.service";

export interface DataPlatformOverview {
  documents: {
    total: number;
    flagged: number;
    recent: Awaited<ReturnType<DocumentsService["list"]>>;
  };
  dedupe: {
    pendingClusters: number;
    duplicateCandidates: DuplicateCluster[];
  };
  ontology: Awaited<ReturnType<OntologyService["getCoverageSummary"]>>;
}

@Injectable()
export class DataPlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly dedupe: DedupeService,
    private readonly ontology: OntologyService
  ) {}

  async overview(tenantId: string): Promise<DataPlatformOverview> {
    const [documents, flaggedDocuments, pendingClusters, coverage, duplicateCandidates] = await Promise.all([
      this.documents.list(tenantId, 10),
      this.prisma.documentMetadata.count({ where: { tenantId, piiStatus: PiiScanStatus.FLAGGED } }),
      this.prisma.identityCluster.count({ where: { tenantId, status: IdentityClusterStatus.PENDING_REVIEW } }),
      this.ontology.getCoverageSummary(),
      this.dedupe.findTenantDuplicateCandidates(tenantId, 5)
    ]);

    const totalDocuments = await this.prisma.documentAsset.count({ where: { tenantId } });

    return {
      documents: {
        total: totalDocuments,
        flagged: flaggedDocuments,
        recent: documents
      },
      dedupe: {
        pendingClusters,
        duplicateCandidates
      },
      ontology: coverage
    };
  }
}
