export type Consultant = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  location?: string;
  availability: string;
  rate?: string;
  experience?: string;
  skills: Array<{
    skill: { id: string; name: string };
    weight: number;
  }>;
};

export type Requirement = {
  id: string;
  title: string;
  clientName: string;
  description: string;
  status: string;
  location?: string;
  skills: Array<{
    skill: { id: string; name: string };
    weight: number;
  }>;
};

export type AnalyticsSummary = {
  consultantCount: number;
  openRequirements: number;
  activeSubmissions: number;
  matchCounts: Record<string, number>;
};

export type MatchScores = {
  linear: number;
  ltr: number;
  final: number;
  llm?: number;
};

export type MatchSignals = {
  retrieval: number;
  vector: number;
  lexical: number;
};

export type MatchResult = {
  matchId: string;
  consultantId: string;
  consultantName: string;
  score: number;
  scores: MatchScores;
  skillScore: number;
  availabilityScore: number;
  explanation: MatchExplanation;
  signals: MatchSignals;
};

export type DocumentMetadata = {
  documentId: string;
  sha256: string;
  sha1?: string | null;
  md5?: string | null;
  ingestionStatus: string;
  piiStatus: string;
  piiSummary?: Record<string, unknown> | null;
  pageCount?: number | null;
  textByteSize?: number | null;
  extractedAt?: string | null;
  lastRedactionAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentAssetKind = "RESUME" | "REQUIREMENT_ATTACHMENT" | "CANDIDATE_NOTE" | "OTHER";
export type DocumentAssetSummary = {
  id: string;
  kind: DocumentAssetKind;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  metadata?: DocumentMetadata | null;
  consultant?: { id: string; firstName: string; lastName: string } | null;
  requirement?: { id: string; title: string; clientName: string } | null;
};

export type DuplicateMatchSummary = {
  consultantId: string;
  consultant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  matchTypes: string[];
  sharedSignatureCount: number;
};

export type DuplicateCandidateCluster = {
  signature: { type: string; valueHash: string };
  consultants: DuplicateMatchSummary[];
};

export type DataPlatformOverview = {
  documents: {
    total: number;
    flagged: number;
    recent: DocumentAssetSummary[];
  };
  dedupe: {
    pendingClusters: number;
    duplicateCandidates: DuplicateCandidateCluster[];
  };
  ontology: {
    activeVersion: { id: string; version: string; source: string; createdAt: string; publishedAt: string | null } | null;
    canonicalSkillCount: number;
    aliasCount: number;
    linkedSkillCount: number;
    coverageTarget: number;
    coverageRatio: number;
  };
};

export type HybridSearchResult = {
  id: string;
  entityType: "CONSULTANT" | "REQUIREMENT";
  entityId: string;
  content: string;
  metadata: Record<string, unknown> | null;
  score: number;
  vectorScore: number;
  lexicalScore: number;
};

export type MatchExplanationContribution = {
  feature: string;
  label: string;
  description: string;
  value: number;
  weight: number;
  contribution: number;
};

export type MatchExplanationFacts = {
  requirement: {
    id: string;
    title: string;
    clientName: string;
    location?: string | null;
    minRate?: number | null;
    maxRate?: number | null;
    topSkills: string[];
  };
  consultant: {
    id: string;
    name: string;
    availability: string;
    location?: string | null;
    rate?: number | null;
    alignedSkills: string[];
  };
  signals: {
    linearScore: number;
    ltrScore: number;
    finalScore: number;
    retrievalScore: number;
    featureLabels: string[];
    availabilityScore: number;
    locationMatch: number;
    rateAlignment: number;
  };
  deltas: {
    locationStatus: string;
    rateDelta?: number | null;
    availabilityLabel: string;
  };
};

export type MatchExplanation = {
  modelVersion: string;
  rankerVersion: string;
  summary: string;
  alignedSkills: string[];
  contributions: MatchExplanationContribution[];
  topFactors: string[];
  deltas: {
    location: {
      consultant?: string | null;
      requirement?: string | null;
      status: string;
      score: number;
    };
    rate: {
      consultantRate?: number | null;
      requirementMin?: number | null;
      requirementMax?: number | null;
      delta?: number | null;
      withinRange: boolean;
    };
    availability: {
      status: string;
      score: number;
      description: string;
    };
  };
  retrieval?: {
    vectorScore: number;
    lexicalScore: number;
    hybridScore?: number;
  };
  scores: MatchScores;
  highlights: string[];
  llm: {
    provider: string;
    confidence: number;
    grounded: boolean;
  };
  facts: MatchExplanationFacts;
};

export type MatchFeedbackOutcome = "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "HIRED" | "REJECTED";


