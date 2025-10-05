import listEndpoints from "express-list-endpoints";
import type { INestApplication } from "@nestjs/common";

export function dumpRoutes(app: INestApplication) {
  const server = app.getHttpAdapter().getInstance();
  const endpoints = listEndpoints(server).flatMap((e) =>
    e.methods.map((m) => ({
      method: String(m || "").toUpperCase(),
      path: String(e.path || "").replace(/\/+/, "/")
    }))
  );

  const normalized = endpoints.map((r) => ({
    method: r.method,
    path: r.path
      .replace(/:([a-zA-Z0-9_]+)/g, "{$1}")
      .replace(/\*/g, "{wildcard}")
  }));
  return normalized;
}

