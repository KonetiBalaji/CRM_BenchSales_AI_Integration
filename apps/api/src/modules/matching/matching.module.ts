import { Module } from "@nestjs/common";

import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { VectorSearchModule } from "../vector-search/vector-search.module";
import { RequestContextModule } from "../../infrastructure/context";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";

import { LearningToRankService } from "./learning-to-rank.service";
import { MatchExplanationBuilder } from "./match-explanation.builder";
import { MatchingEvaluationService } from "./evaluation/matching-evaluation.service";
import { MatchingController } from "./matching.controller";
import { MatchingService } from "./matching.service";

@Module({
  imports: [PrismaModule, VectorSearchModule, RequestContextModule, AiGatewayModule],
  controllers: [MatchingController],
  providers: [MatchingService, LearningToRankService, MatchExplanationBuilder, MatchingEvaluationService],
  exports: [MatchingEvaluationService]
})
export class MatchingModule {}