export interface TestSuite {
  id: string;
  name: string;
  runDate: Date;
  duration: number; // milliseconds
  results: TestResult[];
  summary: TestSummary;
  status: "PASSED" | "FAILED" | "WARNING";
}

export interface TestResult {
  id: string;
  name: string;
  type: "UNIT" | "INTEGRATION" | "E2E" | "PERFORMANCE" | "SECURITY" | "CONTRACT";
  passed: boolean;
  executionTime: number; // milliseconds
  details: string;
  error?: string;
  metrics?: Record<string, number>;
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number; // percentage
  averageExecutionTime: number; // milliseconds
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  type: TestResult["type"];
  steps: TestStep[];
  expectedResult: string;
  actualResult?: string;
  status: "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "SKIPPED";
  executionTime?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface TestStep {
  id: string;
  description: string;
  action: string;
  expectedOutcome: string;
  actualOutcome?: string;
  status: "PENDING" | "PASSED" | "FAILED";
  executionTime?: number;
  error?: string;
}

export interface TestConfiguration {
  timeout: number; // milliseconds
  retries: number;
  parallel: boolean;
  environment: "development" | "staging" | "production";
  testData: Record<string, any>;
  assertions: Assertion[];
}

export interface Assertion {
  id: string;
  type: "EQUALS" | "CONTAINS" | "MATCHES" | "GREATER_THAN" | "LESS_THAN" | "NOT_NULL" | "IS_TRUE" | "IS_FALSE";
  expected: any;
  actual?: any;
  passed?: boolean;
  error?: string;
}

export interface TestReport {
  id: string;
  suiteId: string;
  runDate: Date;
  summary: TestSummary;
  results: TestResult[];
  coverage: TestCoverage;
  recommendations: string[];
  status: "PASSED" | "FAILED" | "WARNING";
  duration: number;
  environment: string;
  version: string;
}

export interface TestCoverage {
  codeCoverage: number; // percentage
  branchCoverage: number; // percentage
  functionCoverage: number; // percentage
  lineCoverage: number; // percentage
  uncoveredLines: number[];
  uncoveredBranches: number[];
}

export interface PerformanceMetrics {
  responseTime: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  throughput: {
    requestsPerSecond: number;
    concurrentUsers: number;
  };
  resourceUsage: {
    cpu: number; // percentage
    memory: number; // MB
    disk: number; // MB
  };
  errorRate: number; // percentage
}

export interface SecurityTestResult {
  vulnerabilityType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  remediation: string;
  status: "DETECTED" | "FIXED" | "ACCEPTED";
  detectedAt: Date;
  fixedAt?: Date;
}

export interface LoadTestResult {
  testName: string;
  duration: number; // seconds
  virtualUsers: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
  status: "PASSED" | "FAILED";
  metrics: PerformanceMetrics;
}
