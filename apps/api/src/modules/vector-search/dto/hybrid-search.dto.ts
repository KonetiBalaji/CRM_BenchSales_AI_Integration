import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from "class-validator";

import { SearchEntityType } from "@prisma/client";

export class SearchFiltersDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsArray()
  @Type(() => String)
  skills?: string[];

  @IsOptional()
  @IsString()
  visaStatus?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRate?: number;
}

export class HybridSearchRequestDto {
  @IsString()
  @MaxLength(2000)
  query!: string;

  @IsOptional()
  @IsEnum(SearchEntityType, { each: true })
  entityTypes?: SearchEntityType[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SearchFiltersDto)
  filters?: SearchFiltersDto;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
