import { Module } from "@nestjs/common";

import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { EmbeddingService } from "./embedding.service";
import { VectorSearchController } from "./vector-search.controller";
import { VectorSearchService } from "./vector-search.service";

@Module({
  imports: [PrismaModule],
  controllers: [VectorSearchController],
  providers: [VectorSearchService, EmbeddingService],
  exports: [VectorSearchService]
})
export class VectorSearchModule {}
