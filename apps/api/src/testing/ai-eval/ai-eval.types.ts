export interface AiEvalTest {
  id: string;
  name: string;
  description: string;
  type: "MATCHING_ACCURACY" | "RESPONSE_QUALITY" | "BIAS_DETECTION" | "HALLUCINATION_DETECTION";
  input: any;
  expectedOutput?: any;
  thresholds: {
    accuracy?: number;
    quality?: number;
    bias?: number;
    hallucination?: number;
  };
  criteria?: any;
  biasTypes?: string[];
  facts?: any[];
  status: "ACTIVE" | "INACTIVE" | "DEPRECATED";
  createdAt: Date;
  updatedAt: Date;
}

export interface AiEvalResult {
  id: string;
  testId: string;
  input: any;
  output: any;
  metrics: Record<string, number>;
  passed: boolean;
  executionTimeMs: number;
  timestamp: Date;
  metadata?: any;
}

export interface AiEvalSuite {
  id: string;
  name: string;
  description: string;
  version: string;
  testCases: AiEvalTest[];
  metrics: EvalMetric[];
  thresholds: Record<string, number>;
  status: "PASSED" | "FAILED" | "RUNNING" | "PENDING";
  passRate?: number;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvalMetric {
  name: string;
  type: "ACCURACY" | "PRECISION" | "RECALL" | "F1_SCORE" | "QUALITY" | "BIAS" | "HALLUCINATION";
  value: number;
  threshold: number;
  unit?: string;
  description?: string;
}

export interface ABTest {
  id: string;
  name: string;
  variants: string[];
  trafficSplit: number[];
  status: "RUNNING" | "COMPLETED" | "PAUSED";
  startDate: Date;
  endDate?: Date;
  results?: ABTestResult[];
  createdAt: Date;
}

export interface ABTestResult {
  id: string;
  testId: string;
  variant: string;
  userId: string;
  outcome: any;
  timestamp: Date;
}

export interface CanaryDeployment {
  id: string;
  modelId: string;
  canaryPercentage: number;
  status: "DEPLOYING" | "RUNNING" | "PROMOTED" | "ROLLED_BACK";
  startDate: Date;
  endDate?: Date;
  metrics?: CanaryMetrics;
  createdAt: Date;
}

export interface CanaryMetrics {
  errorRate: number;
  latencyP95: number;
  successRate: number;
  throughput: number;
  customMetrics?: Record<string, number>;
}

export interface EvalDataset {
  id: string;
  name: string;
  description: string;
  version: string;
  data: any[];
  metadata: {
    size: number;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
  };
}

export interface ModelPerformance {
  modelId: string;
  version: string;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    latency: number;
    throughput: number;
  };
  evaluationDate: Date;
  dataset: string;
}

export interface EvalReport {
  id: string;
  suiteId: string;
  runDate: Date;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
    averageExecutionTime: number;
  };
  results: AiEvalResult[];
  recommendations: string[];
  status: "PASSED" | "FAILED" | "WARNING";
}
