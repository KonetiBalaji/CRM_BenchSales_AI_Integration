import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from "class-validator";

import { DocumentAssetType } from "@prisma/client";

export class CreateUploadRequestDto {
  @IsEnum(DocumentAssetType)
  kind!: DocumentAssetType;

  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MaxLength(255)
  contentType!: string;

  @IsInt()
  @Min(1)
  sizeBytes!: number;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, { message: "sha256 must be a 64 character hex string" })
  sha256!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{40}$/i, { message: "sha1 must be a 40 character hex string" })
  sha1?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{32}$/i, { message: "md5 must be a 32 character hex string" })
  md5?: string;

  @IsOptional()
  @IsUUID()
  consultantId?: string;

  @IsOptional()
  @IsUUID()
  requirementId?: string;
}
