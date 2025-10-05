import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { Resource } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { PrismaInstrumentation } from "@prisma/instrumentation";

const shouldInitTelemetry = process.env.NODE_ENV !== "test" && process.env.OTEL_SDK_DISABLED !== "true";

if (shouldInitTelemetry) {
  if (process.env.OTEL_DEBUG === "true") {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  const resource = Resource.default().merge(
    new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "benchcrm-api",
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: process.env.OTEL_SERVICE_NAMESPACE ?? "benchcrm",
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? "development",
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version ?? "0.1.0"
    })
  );

  const otlpBaseEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/$/, "");
  const traceEndpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? (otlpBaseEndpoint ? `${otlpBaseEndpoint}/v1/traces` : undefined);

  const otelHeaders = parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);

  const traceExporter = traceEndpoint
    ? new OTLPTraceExporter({ url: traceEndpoint, headers: otelHeaders })
    : new ConsoleSpanExporter();

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (req) => {
          const url = req.url ?? "";
          return url.includes("/health") || url.includes("/metrics");
        }
      }),
      new PrismaInstrumentation()
    ]
  });

  (async () => {
    try {
      await sdk.start();
    } catch (error) {
      console.error("Failed to start OpenTelemetry SDK", error);
    }
  })();

  const shutdown = async () => {
    try {
      await sdk.shutdown();
    } catch (error) {
      console.error("Error shutting down OpenTelemetry SDK", error);
    }
  };

  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGUSR2"];
  signals.forEach((signal) => {
    process.once(signal, () => {
      void shutdown().finally(() => {
        process.exit(0);
      });
    });
  });
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
