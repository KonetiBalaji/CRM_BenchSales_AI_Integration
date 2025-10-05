import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createHash, randomBytes } from "node:crypto";

import { NamedEntity, PiiFinding, PiiRedactionResult, PiiTokenConfig } from "./ingestion.types";

interface RedactionContext {
  tenantId: string;
  documentId: string;
  namedEntities?: NamedEntity[];
}

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?){2}\d{4}/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;

@Injectable()
export class PiiRedactionService {
  private readonly logger = new Logger(PiiRedactionService.name);
  private readonly encryptionKey: Buffer;
  private readonly tokenPrefix: string;
  private readonly tokenTtlMs: number;

  constructor(private readonly configService: ConfigService) {
    const config = (this.configService.get<PiiTokenConfig>("pii") ?? {
      secret: process.env.PII_TOKEN_SECRET ?? "local-dev-secret",
      tokenPrefix: "pii",
      tokenTtlHours: 24 * 14
    }) as PiiTokenConfig;

    this.encryptionKey = createHash("sha256").update(config.secret ?? "local-dev-secret").digest();
    this.tokenPrefix = config.tokenPrefix ?? "pii";
    this.tokenTtlMs = Math.max(1, (config.tokenTtlHours ?? 24) * 60 * 60 * 1000);
  }

  redact(text: string, context: RedactionContext): PiiRedactionResult {
    if (!text) {
      return { redactedText: "", findings: [], vault: [], counts: {} };
    }

    const findings: PiiFinding[] = [];
    const vault: Array<{ token: string; ciphertext: string; type: string }> = [];
    const matches = new Map<number, PiiFinding>();

    this.collectRegexFindings(text, EMAIL_REGEX, "EMAIL", matches);
    this.collectRegexFindings(text, PHONE_REGEX, "PHONE", matches);
    this.collectRegexFindings(text, SSN_REGEX, "SSN", matches);

    if (context.namedEntities) {
      for (const entity of context.namedEntities) {
        if (entity.label === "PERSON" && !matches.has(entity.start)) {
          const token = this.generateToken("PERSON");
          const value = text.slice(entity.start, entity.end);
          const finding: PiiFinding = {
            token,
            value,
            type: "PERSON",
            start: entity.start,
            end: entity.end
          };
          matches.set(entity.start, finding);
        }
      }
    }

    const ordered = Array.from(matches.values()).sort((a, b) => a.start - b.start);
    let cursor = 0;
    let redacted = "";

    for (const finding of ordered) {
      if (finding.start < cursor) {
        continue;
      }
      redacted += text.slice(cursor, finding.start);
      redacted += `{{${finding.token}}}`;
      cursor = finding.end;
      findings.push(finding);
      vault.push({ token: finding.token, ciphertext: this.encryptValue(finding.value), type: finding.type });
    }

    redacted += text.slice(cursor);

    const counts = findings.reduce<Record<string, number>>((acc, finding) => {
      acc[finding.type] = (acc[finding.type] ?? 0) + 1;
      return acc;
    }, {});

    return { redactedText: redacted, findings, vault, counts };
  }

  private collectRegexFindings(
    text: string,
    regex: RegExp,
    type: string,
    collector: Map<number, PiiFinding>
  ) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const value = match[0];
      if (!value) {
        continue;
      }
      const start = match.index;
      const end = start + value.length;
      if (collector.has(start)) {
        continue;
      }
      const token = this.generateToken(type);
      collector.set(start, { token, value, type, start, end });
    }
  }

  private generateToken(type: string): string {
    const random = randomBytes(6).toString("hex");
    return `${this.tokenPrefix}:${type}:${random}`;
  }

  private encryptValue(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
  }
}
