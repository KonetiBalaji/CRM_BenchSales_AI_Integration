import { Injectable, Logger } from "@nestjs/common";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const textract = require("textract");

interface ExtractionResult {
  text: string;
  length: number;
  ocr: boolean;
}

@Injectable()
export class TextExtractionService {
  private readonly logger = new Logger(TextExtractionService.name);
  private tesseractWorker: any;

  async extract(buffer: Buffer, contentType: string, fileName: string): Promise<ExtractionResult> {
    const normalizedType = contentType?.toLowerCase() ?? "";

    try {
      const text = await this.extractWithTextract(buffer, normalizedType, fileName);
      if (text.trim().length > 0) {
        return { text, length: text.length, ocr: false };
      }
    } catch (error) {
      this.logger.warn(`textract failed for ${fileName}: ${(error as Error).message}`);
    }

    if (normalizedType.startsWith("image/") || normalizedType.includes("png") || normalizedType.includes("jpeg")) {
      try {
        const text = await this.extractWithTesseract(buffer);
        return { text, length: text.length, ocr: true };
      } catch (error) {
        this.logger.warn(`tesseract failed for ${fileName}: ${(error as Error).message}`);
      }
    }

    const fallback = buffer.toString("utf8");
    return { text: fallback, length: fallback.length, ocr: false };
  }

  private extractWithTextract(buffer: Buffer, mime: string, fileName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = mime ? { preserveLineBreaks: true, typeOverride: mime } : { preserveLineBreaks: true };
      textract.fromBufferWithMime(mime || undefined, buffer, options, (error: Error | null, text: string) => {
        if (error) {
          reject(error);
          return;
        }
        resolve((text ?? "").replace(/\u0000/g, " "));
      });
    });
  }

  private async extractWithTesseract(buffer: Buffer): Promise<string> {
    const worker = await this.getTesseractWorker();
    const result = await worker.recognize(buffer);
    return (result?.data?.text ?? "").replace(/\u0000/g, " ");
  }

  private async getTesseractWorker() {
    if (this.tesseractWorker) {
      return this.tesseractWorker;
    }
    try {
      const { createWorker } = await import("tesseract.js");
      this.tesseractWorker = await createWorker();
      await this.tesseractWorker.loadLanguage("eng");
      await this.tesseractWorker.initialize("eng");
      return this.tesseractWorker;
    } catch (error) {
      this.logger.warn(`Unable to initialize tesseract worker: ${(error as Error).message}`);
      throw error;
    }
  }
}
