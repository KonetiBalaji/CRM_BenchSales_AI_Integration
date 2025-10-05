import { Injectable } from "@nestjs/common";

@Injectable()
export class EvalsService {
  async submitRetrievalEval(_tenantId: string, payload: { pairs: Array<{ query: string; expectedIds: string[] }> }) {
    // Stub: ingest labeled pairs
    return { status: "queued", count: payload.pairs.length };
  }

  async metrics(_tenantId: string) {
    return { recallAt50: 0.0, latencyP95Ms: 0 };
  }
}


