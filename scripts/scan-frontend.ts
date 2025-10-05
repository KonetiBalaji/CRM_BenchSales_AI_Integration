import fg from "fast-glob";
import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

type Hit = { method?: string; path: string; file: string; line: number };

const ROOT = process.cwd();
const API_BASE_HINTS = [/^\/api\//, /\/api\//];

function normalizePath(p: string) {
  return p
    .replace(/https?:\/\/[^/]+/i, "")
    .replace(/\/+/, "/")
    .replace(/:([a-zA-Z0-9_]+)/g, "{$1}")
    .replace(/\[(.+?)\]/g, "{$1}");
}

function extractStringLiteral(node: any): string | null {
  if (!node) return null;
  if (node.type === "StringLiteral") return node.value;
  if (node.type === "TemplateLiteral" && node.quasis.length) {
    const raw = node.quasis.map((q: any) => q.value.cooked).join("{param}");
    return raw || null;
  }
  return null;
}

(async () => {
  const files = await fg([
    "apps/web/**/*.{ts,tsx,js,jsx}",
    "apps/frontend/**/*.{ts,tsx,js,jsx}",
    "packages/**/*.{ts,tsx,js,jsx}"
  ], { ignore: ["**/node_modules/**", "**/.next/**", "**/dist/**"] });

  const hits: Hit[] = [];

  for (const file of files) {
    const code = fs.readFileSync(file, "utf8");
    let ast: any;
    try {
      ast = parse(code, { sourceType: "unambiguous", plugins: ["typescript", "jsx"] });
    } catch {
      continue;
    }

    traverse(ast, {
      CallExpression(pathNode) {
        const callee = pathNode.node.callee as any;
        const isFetch = callee?.type === "Identifier" && callee.name === "fetch";
        const isAxios = callee?.type === "MemberExpression" &&
          (callee.object?.name === "axios" || callee.object?.name === "api" || callee.object?.name === "http") &&
          callee.property?.type === "Identifier";
        if (!isFetch && !isAxios) return;

        const args: any[] = pathNode.node.arguments as any[];
        if (!args.length) return;

        const url = extractStringLiteral(args[0]);
        if (!url) return;
        if (!API_BASE_HINTS.some((rx) => rx.test(url))) return;

        let method: string | undefined;
        if (isAxios) {
          const m = callee.property?.name?.toUpperCase?.();
          if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(m)) method = m;
        } else if (isFetch && args[1]?.type === "ObjectExpression") {
          const methodProp = (args[1].properties || []).find((p: any) => p.key?.name === "method" || p.key?.value === "method");
          const mlit = methodProp && (methodProp.value?.value || methodProp.value?.extra?.rawValue);
          if (mlit) method = String(mlit).toUpperCase();
        }
        if (!method) method = "GET";

        const loc = pathNode.node.loc?.start?.line ?? 0;
        hits.push({ method, path: normalizePath(url), file: path.relative(ROOT, file), line: loc });
      }
    });
  }

  const byKey = new Map<string, Hit[]>();
  for (const h of hits) {
    const key = `${h.method} ${h.path}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(h);
  }

  const out = {
    usedEndpoints: [...byKey.entries()].map(([key, arr]) => ({
      key,
      method: arr[0].method,
      path: arr[0].path,
      hits: arr.map((a) => ({ file: a.file, line: a.line }))
    }))
  };
  fs.writeFileSync("frontend-usage.json", JSON.stringify(out, null, 2));
  console.log(`Scanned ${files.length} files. Found ${out.usedEndpoints.length} unique API usages.`);
})();

