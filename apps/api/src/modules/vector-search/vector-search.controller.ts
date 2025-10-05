import { Body, Controller, Param, ParseIntPipe, Post } from "@nestjs/common";
import { SearchEntityType } from "@prisma/client";

import { VectorSearchService, HybridSearchResult } from "./vector-search.service";
import { HybridSearchRequestDto } from "./dto/hybrid-search.dto";
import { BulkIndexRequestDto, IndexEntityRequestDto } from "./dto/index-request.dto";

@Controller("tenants/:tenantId/search")
export class VectorSearchController {
  constructor(private readonly vectorSearch: VectorSearchService) {}

  @Post("/index")
  indexEntity(@Param("tenantId") tenantId: string, @Body() payload: IndexEntityRequestDto) {
    return this.vectorSearch.indexEntity(tenantId, payload);
  }

  @Post("/index/all")
  bulkIndex(@Param("tenantId") tenantId: string, @Body() payload: BulkIndexRequestDto) {
    return this.vectorSearch.bulkIndex(tenantId, payload);
  }

  @Post("/hybrid")
  hybridSearch(@Param("tenantId") tenantId: string, @Body() payload: HybridSearchRequestDto): Promise<HybridSearchResult[]> {
    return this.vectorSearch.hybridSearch(tenantId, payload);
  }
}
