import { IsEnum, IsOptional, IsString } from "class-validator";

import { SearchEntityType } from "@prisma/client";

export class IndexEntityRequestDto {
  @IsEnum(SearchEntityType)
  entityType!: SearchEntityType;

  @IsString()
  entityId!: string;
}

export class BulkIndexRequestDto {
  @IsOptional()
  @IsEnum(SearchEntityType)
  entityType?: SearchEntityType;
}
