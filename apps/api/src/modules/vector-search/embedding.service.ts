import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

interface OpenAIConfig {
  apiKey: string;
  embeddingModel: string;
  embeddingDimensions: number;
}

@Injectable()
export class EmbeddingService {
  private readonly client: OpenAI | null;
  private readonly model: string;
  private readonly dimensions: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("openaiApiKey") ?? "";
    const openaiConfig = this.configService.get<OpenAIConfig>("openai") ?? {
      apiKey,
      embeddingModel: "text-embedding-3-large",
      embeddingDimensions: 3072
    };

    this.model = openaiConfig.embeddingModel;
    this.dimensions = openaiConfig.embeddingDimensions;
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  getEmbeddingDimensions(): number {
    return this.dimensions;
  }

  async generateEmbedding(input: string): Promise<number[]> {
    if (!this.client) {
      throw new Error("OpenAI API key is not configured; cannot generate embeddings");
    }
    const trimmed = input.trim();
    if (!trimmed) {
      return new Array(this.dimensions).fill(0);
    }

    const response = await this.client.embeddings.create({ model: this.model, input: trimmed });
    const vector = response.data[0]?.embedding ?? [];

    if (vector.length !== this.dimensions) {
      if (vector.length === 0) {
        return new Array(this.dimensions).fill(0);
      }
      if (vector.length > this.dimensions) {
        return vector.slice(0, this.dimensions);
      }
      return [...vector, ...new Array(this.dimensions - vector.length).fill(0)];
    }

    return vector;
  }
}
