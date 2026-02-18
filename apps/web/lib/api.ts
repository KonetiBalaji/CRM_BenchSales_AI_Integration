import { API_TOKEN, API_URL } from "./config";
import type {
  AnalyticsSummary,
  Consultant,
  DataPlatformOverview,
  DocumentAssetKind,
  HybridSearchResult,
  MatchFeedbackOutcome,
  MatchResult,
  Requirement
} from "./types";

const IS_BUILD_PHASE = process.env.NEXT_PHASE === "phase-production-build";

const FALLBACK_ANALYTICS_SUMMARY: AnalyticsSummary = {
  consultantCount: 12,
  openRequirements: 4,
  activeSubmissions: 7,
  matchCounts: {
    REVIEW: 3,
    SHORTLISTED: 2,
    SUBMITTED: 1,
    HIRED: 0
  }
};

const FALLBACK_REQUIREMENTS: Requirement[] = [
  {
    id: "mock-req-1",
    title: "Senior Fullstack Engineer",
    clientName: "Acme Manufacturing",
    description: "Placeholder requirement shown when the API is offline.",
    status: "OPEN",
    location: "Remote",
    skills: [
      { skill: { id: "skill-ts", name: "TypeScript" }, weight: 60 },
      { skill: { id: "skill-react", name: "React" }, weight: 40 }
    ]
  },
  {
    id: "mock-req-2",
    title: "Salesforce Solution Architect",
    clientName: "Globex Corp",
    description: "Use pnpm dev:api to load live requirements.",
    status: "OPEN",
    location: "Austin, TX",
    skills: [
      { skill: { id: "skill-sf", name: "Salesforce" }, weight: 70 },
      { skill: { id: "skill-flows", name: "Flow Builder" }, weight: 30 }
    ]
  }
];

const FALLBACK_CONSULTANTS: Consultant[] = [
  {
    id: "mock-consultant-1",
    firstName: "Jamie",
    lastName: "Rivera",
    email: "jamie.rivera@example.com",
    phone: "+1-555-0101",
    location: "Remote",
    availability: "AVAILABLE",
    rate: "$95/hr",
    experience: "8 years in TypeScript and Node.js",
    skills: [
      { skill: { id: "skill-ts", name: "TypeScript" }, weight: 65 },
      { skill: { id: "skill-node", name: "Node.js" }, weight: 35 }
    ]
  },
  {
    id: "mock-consultant-2",
    firstName: "Priya",
    lastName: "Desai",
    email: "priya.desai@example.com",
    phone: "+1-555-0120",
    location: "Austin, TX",
    availability: "INTERVIEWING",
    rate: "$110/hr",
    experience: "10 years architecting Salesforce implementations",
    skills: [
      { skill: { id: "skill-sf", name: "Salesforce" }, weight: 70 },
      { skill: { id: "skill-apex", name: "Apex" }, weight: 30 }
    ]
  }
];

const FALLBACK_DATA_PLATFORM: DataPlatformOverview = {
  documents: {
    total: 4,
    flagged: 1,
    recent: [
      {
        id: "mock-doc-1",
        kind: "RESUME",
        fileName: "jamie-rivera-resume.pdf",
        contentType: "application/pdf",
        sizeBytes: 245760,
        createdAt: new Date().toISOString(),
        metadata: {
          documentId: "mock-doc-1",
          sha256: "mock-sha256",
          ingestionStatus: "COMPLETED",
          piiStatus: "CLEARED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        consultant: { id: "mock-consultant-1", firstName: "Jamie", lastName: "Rivera" },
        requirement: null
      },
      {
        id: "mock-doc-2",
        kind: "REQUIREMENT_ATTACHMENT",
        fileName: "globex-architect-notes.docx",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sizeBytes: 131072,
        createdAt: new Date().toISOString(),
        metadata: {
          documentId: "mock-doc-2",
          sha256: "mock-sha256-2",
          ingestionStatus: "COMPLETED",
          piiStatus: "FLAGGED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        consultant: null,
        requirement: { id: "mock-req-2", title: "Salesforce Solution Architect", clientName: "Globex Corp" }
      }
    ]
  },
  dedupe: {
    pendingClusters: 0,
    duplicateCandidates: []
  },
  ontology: {
    activeVersion: null,
    canonicalSkillCount: 420,
    aliasCount: 960,
    linkedSkillCount: 310,
    coverageTarget: 500,
    coverageRatio: 0.62
  }
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function withFallback<T>(loader: () => Promise<T>, fallback: T, context: string): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    if (IS_BUILD_PHASE) {
      console.warn(`[api] Using fallback data for ${context}; API not reachable during build.`);
      return clone(fallback);
    }
    throw error;
  }
}
type ApiOptions = {
  tenantId: string;
  init?: RequestInit;
};

export type CreateDocumentUploadPayload = {
  kind: DocumentAssetKind;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  sha1?: string;
  md5?: string;
  consultantId?: string;
  requirementId?: string;
};

export type DocumentUploadResponse = {
  documentId: string;
  uploadUrl: string;
  expiresInSeconds: number;
  headers: Record<string, string>;
};

export type HybridSearchPayload = {
  query: string;
  entityTypes?: ("CONSULTANT" | "REQUIREMENT")[];
  filters?: {
    location?: string;
    maxRate?: number;
  };
  limit?: number;
};

export type MatchFeedbackPayload = {
  outcome: MatchFeedbackOutcome;
  rating?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export class ApiRequestError extends Error {
  status?: number;
  url?: string;

  constructor(message: string, options?: { status?: number; url?: string; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "ApiRequestError";
    this.status = options?.status;
    this.url = options?.url;
  }
}

async function request<T>(path: string, { tenantId, init }: ApiOptions): Promise<T> {
  const url = `${API_URL}/tenants/${tenantId}${path}`;

  let response: Response;
  try {
    const headers = new Headers(init?.headers as HeadersInit);
    headers.set("Content-Type", "application/json");
    if (API_TOKEN) {
      headers.set("Authorization", `Bearer ${API_TOKEN}`);
    }

    response = await fetch(url, {
      ...init,
      headers,
      cache: "no-store"
    });
  } catch (error) {
    throw new ApiRequestError("Unable to reach the BenchCRM API", { url, cause: error });
  }

  if (!response.ok) {
    let message: string | undefined;
    try {
      message = await response.text();
    } catch (error) {
      message = undefined;
    }

    const parsedMessage = extractMessageFromBody(message);
    const errorMessage = buildErrorMessage(parsedMessage, response.status);

    throw new ApiRequestError(errorMessage, {
      status: response.status,
      url
    });
  }

  return (await response.json()) as T;
}

function extractMessageFromBody(body?: string): string | undefined {
  if (!body) {
    return undefined;
  }
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(trimmed) as { message?: unknown; error?: unknown; detail?: unknown };
    const message = parsed.message ?? parsed.error ?? parsed.detail;
    return typeof message === "string" && message.length > 0 ? message : trimmed;
  } catch (error) {
    return trimmed;
  }
}

function buildErrorMessage(message: string | undefined, status?: number): string {
  if (status === 401) {
    return (
      "Authentication required. Set NEXT_PUBLIC_API_TOKEN in the web app or start the API with AUTH0_DISABLE_VERIFICATION=true."
    );
  }
  if (message && message.length > 0) {
    return message;
  }
  return "Request failed";
}

export function getAnalyticsSummary(tenantId: string) {
  return withFallback(
    () => request<AnalyticsSummary>("/analytics/summary", { tenantId }),
    FALLBACK_ANALYTICS_SUMMARY,
    "analytics summary"
  );
}

export function getConsultants(tenantId: string, search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return withFallback(
    () => request<Consultant[]>(`/consultants${query}`, { tenantId }),
    FALLBACK_CONSULTANTS,
    "consultant list"
  );
}

export function getRequirements(tenantId: string) {
  return withFallback(
    () => request<Requirement[]>("/requirements", { tenantId }),
    FALLBACK_REQUIREMENTS,
    "requirements"
  );
}

export function getDataPlatformOverview(tenantId: string) {
  return withFallback(
    () => request<DataPlatformOverview>("/data-platform/overview", { tenantId }),
    FALLBACK_DATA_PLATFORM,
    "data platform overview"
  );
}

export async function matchRequirement(tenantId: string, requirementId: string) {
  const response = await request<MatchResult[]>(`/matching/requirements/${requirementId}`, {
    tenantId,
    init: {
      method: "POST",
      body: JSON.stringify({})
    }
  });
  return response;
}



export function getDocumentDownloadUrl(tenantId: string, documentId: string) {
  return request<{ documentId: string; downloadUrl: string; expiresInSeconds: number }>(
    `/documents/${documentId}/download-url`,
    { tenantId }
  );
}

export function hybridSearch(tenantId: string, payload: HybridSearchPayload) {
  return request<HybridSearchResult[]>("/search/hybrid", {
    tenantId,
    init: {
      method: "POST",
      body: JSON.stringify(payload)
    }
  });
}

export function submitMatchFeedback(tenantId: string, matchId: string, payload: MatchFeedbackPayload) {
  return request<{ status: string }>(`/matching/matches/${matchId}/feedback`, {
    tenantId,
    init: {
      method: "POST",
      body: JSON.stringify(payload)
    }
  });
}

// Balaji Koneti: AI & Communication API endpoints
export function startSourcing(tenantId: string, requirementId: string, maxCandidates: number, screeningCriteria: string[]) {
  return request<{ jobId: string; status: string; estimatedCompletion: string }>("/ai-recruiter-agent/source", {
    tenantId,
    init: {
      method: "POST",
      body: JSON.stringify({ requirementId, maxCandidates, screeningCriteria })
    }
  });
}

export function startScreening(tenantId: string, candidateIds: string[], screeningQuestions: string[]) {
  return request<{ jobId: string; status: string; candidatesCount: number }>("/ai-recruiter-agent/screen", {
    tenantId,
    init: {
      method: "POST",
      body: JSON.stringify({ candidateIds, screeningQuestions })
    }
  });
}

export function startOutreach(tenantId: string, candidateIds: string[], messageTemplate: string, followUpSchedule: { days: number[]; maxAttempts: number }) {
  return request<{ campaignId: string; status: string; candidatesCount: number }>("/ai-recruiter-agent/outreach", {
    tenantId,
    init: {
      method: "POST",
      body: JSON.stringify({ candidateIds, messageTemplate, followUpSchedule })
    }
  });
}

export function getAgentPerformance(tenantId: string, period?: string, metricType?: string) {
  const query = new URLSearchParams();
  if (period) query.append("period", period);
  if (metricType) query.append("metricType", metricType);
  return request<{ sourcing: any; screening: any; outreach: any }>(`/ai-recruiter-agent/performance?${query}`, { tenantId });
}

export function getInbox(tenantId: string, type?: string, status?: string, limit?: string, offset?: string) {
  const query = new URLSearchParams();
  if (type) query.append("type", type);
  if (status) query.append("status", status);
  if (limit) query.append("limit", limit);
  if (offset) query.append("offset", offset);
  return request<{ communications: any[]; pagination: any }>(`/communications/inbox?${query}`, { tenantId });
}

export function draftMessage(tenantId: string, type: string, recipient: string, context: Record<string, any>) {
  return request<{ messageId: string; subject: string; body: string; suggestions: string[] }>("/communications/draft", {
    tenantId,
    init: {
      method: "POST",
      body: JSON.stringify({ type, recipient, context })
    }
  });
}

export function createCampaign(tenantId: string, name: string, templateId: string, segmentCriteria: Record<string, any>, scheduledAt?: string) {
  return request<{ campaignId: string; name: string; status: string; audienceSize: number; scheduledAt?: string }>("/email-campaigns", {
    tenantId,
    init: {
      method: "POST",
      body: JSON.stringify({ name, templateId, segmentCriteria, scheduledAt })
    }
  });
}

export function getCampaigns(tenantId: string, status?: string, limit?: string, offset?: string) {
  const query = new URLSearchParams();
  if (status) query.append("status", status);
  if (limit) query.append("limit", limit);
  if (offset) query.append("offset", offset);
  return request<any[]>(`/email-campaigns?${query}`, { tenantId });
}

export function discoverCandidates(tenantId: string, requirementId: string, searchCriteria: Record<string, any>, maxResults: number, sources: string[]) {
  return request<{ discoveryId: string; candidates: any[]; totalFound: number; searchTime: string }>("/ai-talent-sourcing/discover", {
    tenantId,
    init: {
      method: "POST",
      body: JSON.stringify({ requirementId, searchCriteria, maxResults, sources })
    }
  });
}

export function enrichCandidate(tenantId: string, candidateId: string, sources: string[], includeSocial: boolean) {
  return request<{ candidateId: string; enrichedData: any; confidence: number; lastUpdated: string }>("/ai-talent-sourcing/enrich", {
    tenantId,
    init: {
      method: "POST",
      body: JSON.stringify({ candidateId, sources, includeSocial })
    }
  });
}

// Balaji Koneti: Analytics & Reports API endpoints
export function createReport(tenantId: string, name: string, dataSource: string, filters: Record<string, any>, grouping: Record<string, any>, visualization: Record<string, any>) {
  return request<{ reportId: string; name: string; status: string; dataSource: string; createdAt: string }>("/custom-reports", {
    tenantId,
    init: {
      method: "POST",
      body: JSON.stringify({ name, dataSource, filters, grouping, visualization })
    }
  });
}

export function getReports(tenantId: string, dataSource?: string, status?: string, limit?: string, offset?: string) {
  const query = new URLSearchParams();
  if (dataSource) query.append("dataSource", dataSource);
  if (status) query.append("status", status);
  if (limit) query.append("limit", limit);
  if (offset) query.append("offset", offset);
  return request<any[]>(`/custom-reports?${query}`, { tenantId });
}

export function generateReportData(tenantId: string, reportId: string, format?: string, includeMetadata?: string) {
  const query = new URLSearchParams();
  if (format) query.append("format", format);
  if (includeMetadata) query.append("includeMetadata", includeMetadata);
  return request<{ data: any[]; metadata?: any }>(`/custom-reports/${reportId}/data?${query}`, { tenantId });
}

export function createInvoice(tenantId: string, placementId: string, clientId: string, amount: number, currency: string, dueDate: string, lineItems: Array<{ description: string; quantity: number; rate: number; amount: number }>) {
  return request<{ invoiceId: string; invoiceNumber: string; status: string; amount: number; currency: string; dueDate: string; createdAt: string }>("/invoicing/invoices", {
    tenantId,
    init: {
      method: "POST",
      body: JSON.stringify({ placementId, clientId, amount, currency, dueDate, lineItems })
    }
  });
}

export function getInvoices(tenantId: string, status?: string, clientId?: string, dateFrom?: string, dateTo?: string, limit?: string, offset?: string) {
  const query = new URLSearchParams();
  if (status) query.append("status", status);
  if (clientId) query.append("clientId", clientId);
  if (dateFrom) query.append("dateFrom", dateFrom);
  if (dateTo) query.append("dateTo", dateTo);
  if (limit) query.append("limit", limit);
  if (offset) query.append("offset", offset);
  return request<any[]>(`/invoicing/invoices?${query}`, { tenantId });
}

export function recordPayment(tenantId: string, invoiceId: string, amount: number, paymentDate: string, paymentMethod: string, reference: string, notes?: string) {
  return request<{ paymentId: string; invoiceId: string; amount: number; paymentDate: string; status: string; balance: number }>(`/invoicing/invoices/${invoiceId}/payments`, {
    tenantId,
    init: {
      method: "POST",
      body: JSON.stringify({ amount, paymentDate, paymentMethod, reference, notes })
    }
  });
}

export function getSlaMetrics(tenantId: string, period?: string, serviceType?: string, includeAlerts?: string) {
  const query = new URLSearchParams();
  if (period) query.append("period", period);
  if (serviceType) query.append("serviceType", serviceType);
  if (includeAlerts) query.append("includeAlerts", includeAlerts);
  return request<{ overview: any; byService: any; alerts: any[] }>(`/performance-metrics/sla?${query}`, { tenantId });
}

export function getConversionMetrics(tenantId: string, period?: string, pipelineStage?: string, includeFunnel?: string) {
  const query = new URLSearchParams();
  if (period) query.append("period", period);
  if (pipelineStage) query.append("pipelineStage", pipelineStage);
  if (includeFunnel) query.append("includeFunnel", includeFunnel);
  return request<{ overview: any; funnel: any[]; bySource: any }>(`/performance-metrics/conversion?${query}`, { tenantId });
}

export function getProductivityMetrics(tenantId: string, period?: string, recruiterId?: string, includeTeam?: string) {
  const query = new URLSearchParams();
  if (period) query.append("period", period);
  if (recruiterId) query.append("recruiterId", recruiterId);
  if (includeTeam) query.append("includeTeam", includeTeam);
  return request<{ overview: any; byRecruiter: any[]; teamMetrics: any }>(`/performance-metrics/productivity?${query}`, { tenantId });
}