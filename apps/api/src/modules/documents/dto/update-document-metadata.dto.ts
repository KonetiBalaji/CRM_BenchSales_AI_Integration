import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsObject, IsString, Min } from "class-validator";

import { DocumentIngestionStatus, PiiScanStatus } from "@prisma/client";

export class UpdateDocumentMetadataDto {
  @IsOptional()
  @IsEnum(DocumentIngestionStatus)
  ingestionStatus?: DocumentIngestionStatus;

  @IsOptional()
  @IsEnum(PiiScanStatus)
  piiStatus?: PiiScanStatus;

  @IsOptional()
  @IsObject()
  piiSummary?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pageCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  textByteSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ingestionLatencyMs?: number;

  @IsOptional()
  @IsString()
  extractedAt?: string;

  @IsOptional()
  @IsString()
  lastRedactionAt?: string;
}
