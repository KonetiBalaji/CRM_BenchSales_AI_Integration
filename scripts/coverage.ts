import fs from "fs";

type Endpoint = { method: string; path: string };

type FrontHit = { file: string; line: number };

function loadBackend(file: string): Endpoint[] {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const routesField = j.routes;
  const pathsField = j.paths;

  // Case 1: our dev route shape { routes: [{ method, path }, ...] }
  if (Array.isArray(routesField)) {
    return routesField.map((r: any) => ({ method: String(r.method || "").toUpperCase(), path: String(r.path || "") }));
  }

  // Case 2: OpenAPI JSON (paths is an object)
  if (pathsField && typeof pathsField === "object" && !Array.isArray(pathsField)) {
    const out: Endpoint[] = [];
    for (const p of Object.keys(pathsField)) {
      const ops = pathsField[p] || {};
      for (const m of Object.keys(ops)) {
        out.push({ method: String(m || "").toUpperCase(), path: p });
      }
    }
    return out;
  }

  // Case 3: already an array in j.paths
  if (Array.isArray(pathsField)) {
    return pathsField.map((r: any) => ({ method: String(r.method || "").toUpperCase(), path: String(r.path || "") }));
  }

  return [];
}

function loadFrontend(file: string): Map<string, { files: FrontHit[] }> {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const map = new Map<string, { files: FrontHit[] }>();
  for (const u of j.usedEndpoints ?? []) {
    map.set(`${u.method} ${u.path}`, { files: u.hits as FrontHit[] });
  }
  return map;
}

const backend = loadBackend("routes.json");
const frontend = loadFrontend("frontend-usage.json");

const rows: string[] = [];
rows.push(["Method", "Path", "LinkedToUI", "UsageCount", "Files"].join(","));

let linked = 0;
for (const b of backend) {
  const key = `${b.method} ${b.path}`;
  const hit = frontend.get(key);
  const yes = !!hit;
  if (yes) linked += 1;
  rows.push([
    b.method,
    b.path,
    yes ? "YES" : "NO",
    String(hit ? hit.files.length : 0),
    hit ? `"${hit.files.map((f) => `${f.file}:${f.line}`).join(" | ")}"` : "\"\""
  ].join(","));
}

fs.writeFileSync("api-coverage.csv", rows.join("\n"));

console.log(`Total backend endpoints: ${backend.length}`);
console.log(`Used by frontend:        ${linked}`);
console.log(`Not used by frontend:    ${backend.length - linked}`);
console.log(`CSV written: api-coverage.csv`);
