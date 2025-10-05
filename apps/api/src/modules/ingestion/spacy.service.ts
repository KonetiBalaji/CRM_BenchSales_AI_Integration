import { Injectable, Logger } from "@nestjs/common";
import { spawn } from "node:child_process";

import { NamedEntity } from "./ingestion.types";

@Injectable()
export class SpacyService {
  private readonly logger = new Logger(SpacyService.name);

  async extractEntities(text: string): Promise<NamedEntity[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    try {
      const result = await this.runPython(text);
      if (result) {
        return result;
      }
    } catch (error) {
      this.logger.warn(`spaCy execution failed: ${(error as Error).message}`);
    }

    return this.fallbackExtraction(text);
  }

  private runPython(text: string): Promise<NamedEntity[] | null> {
    return new Promise((resolve, reject) => {
      const script = [
        "import json, sys",
        "try:",
        "    import spacy",
        "except ImportError:",
        "    print(json.dumps({'error': 'spacy_missing'}))",
        "    sys.exit(0)",
        "try:",
        "    nlp = spacy.load('en_core_web_sm')",
        "except OSError:",
        "    nlp = spacy.blank('en')",
        "text = sys.stdin.read()",
        "doc = nlp(text)",
        "entities = [{'text': ent.text, 'label': ent.label_, 'start': ent.start_char, 'end': ent.end_char} for ent in doc.ents]",
        "print(json.dumps({'entities': entities}))"
      ].join(";\n");

      const process = spawn("python", ["-c", script]);
      const chunks: Buffer[] = [];
      const errors: Buffer[] = [];

      process.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      process.stderr.on("data", (chunk) => errors.push(Buffer.from(chunk)));
      process.on("error", (error) => reject(error));
      process.on("close", (code) => {
        if (code !== 0 && errors.length > 0) {
          this.logger.warn(`spaCy stderr: ${Buffer.concat(errors).toString("utf8")}`);
        }
        const payload = Buffer.concat(chunks).toString("utf8");
        if (!payload) {
          resolve(null);
          return;
        }
        try {
          const parsed = JSON.parse(payload) as { entities?: NamedEntity[]; error?: string };
          if (parsed.error) {
            this.logger.debug(`spaCy reported error: ${parsed.error}`);
            resolve(null);
            return;
          }
          resolve(parsed.entities ?? []);
        } catch (error) {
          reject(error);
        }
      });

      process.stdin.write(text, "utf8");
      process.stdin.end();

      setTimeout(() => {
        if (!process.killed) {
          process.kill();
          resolve(null);
        }
      }, 5_000);
    });
  }

  private fallbackExtraction(text: string): NamedEntity[] {
    const findings: NamedEntity[] = [];
    const regex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      findings.push({
        text: match[1],
        label: "PERSON",
        start: match.index,
        end: match.index + match[1].length
      });
      if (findings.length >= 5) {
        break;
      }
    }
    return findings;
  }
}
