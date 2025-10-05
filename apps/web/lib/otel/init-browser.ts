"use client";

import { context, diag, DiagConsoleLogger, DiagLogLevel, propagation, SpanStatusCode, trace } from "@opentelemetry/api";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { Resource } from "@opentelemetry/resources";
import { BatchSpanProcessor, ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

let initialized = false;

export function initBrowserTelemetry() {
  if (initialized || typeof window === "undefined") {
    return;
  }

  if (process.env.NEXT_PUBLIC_OTEL_DEBUG === "true") {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  const telemetryDisabled = process.env.NEXT_PUBLIC_OTEL_SDK_DISABLED === "true";
  if (telemetryDisabled) {
    initialized = true;
    return;
  }

  const resource = Resource.default().merge(
    new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME ?? "benchcrm-web",
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV ?? process.env.NODE_ENV ?? "development",
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: "benchcrm",
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0"
    })
  );

  const provider = new WebTracerProvider({ resource });

  const otlpBaseEndpoint = process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/$/, "");
  const tracesEndpoint = process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? (otlpBaseEndpoint ? `${otlpBaseEndpoint}/v1/traces` : undefined);
  const headers = parseHeaders(process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_HEADERS);

  const exporter = tracesEndpoint ? new OTLPTraceExporter({ url: tracesEndpoint, headers }) : new ConsoleSpanExporter();
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));

  provider.register({
    contextManager: new ZoneContextManager(),
    propagator: new W3CTraceContextPropagator()
  });

  instrumentFetch(provider, buildCorsUrlList());

  initialized = true;
}

function instrumentFetch(provider: WebTracerProvider, allowedUrls: string[]): void {
  const tracer = provider.getTracer("benchcrm-web");
  const originalFetch = window.fetch.bind(window);
  const normalizedAllowed = allowedUrls.map((url) => url.replace(/\/$/, ""));

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = createRequest(input, init);

    if (!shouldTraceRequest(request.url, normalizedAllowed)) {
      return originalFetch(request);
    }

    return tracer.startActiveSpan(`HTTP ${request.method}`, async (span) => {
      span.setAttribute("http.method", request.method);
      span.setAttribute("http.url", request.url);

      const carrier: Record<string, string> = {};
      propagation.inject(context.active(), carrier);

      const headers = new Headers(request.headers);
      for (const [key, value] of Object.entries(carrier)) {
        headers.set(key, value);
      }

      const requestWithHeaders = new Request(request, { headers });

      try {
        const response = await originalFetch(requestWithHeaders);
        span.setAttribute("http.status_code", response.status);
        return response;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  };
}

function createRequest(input: RequestInfo | URL, init?: RequestInit): Request {
  if (input instanceof Request) {
    return input;
  }
  return new Request(input, init);
}

function shouldTraceRequest(url: string, allowed: string[]): boolean {
  if (allowed.length === 0) {
    return true;
  }
  return allowed.some((prefix) => url.startsWith(prefix));
}

function buildCorsUrlList() {
  const urls = new Set<string>();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  urls.add(apiBase.replace(/\/$/, ""));
  const additional = process.env.NEXT_PUBLIC_OTEL_PROPAGATE_URLS?.split(",") ?? [];
  additional.forEach((value) => {
    const trimmed = value.trim();
    if (trimmed) {
      urls.add(trimmed.replace(/\/$/, ""));
    }
  });
  return Array.from(urls);
}

function parseHeaders(headers?: string) {
  if (!headers) {
    return undefined;
  }
  return headers.split(",").reduce<Record<string, string>>((acc, item) => {
    const [key, value] = item.split("=");
    if (key && value) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});
}
