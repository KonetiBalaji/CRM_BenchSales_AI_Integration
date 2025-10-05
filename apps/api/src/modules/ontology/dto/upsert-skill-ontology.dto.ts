import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";

import { SkillAliasMatchType } from "@prisma/client";

export class OntologyAliasDto {
  @IsString()
  @MaxLength(255)
  value!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsOptional()
  @IsEnum(SkillAliasMatchType)
  matchType?: SkillAliasMatchType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  confidence?: number;
}

export class OntologySkillDto {
  @IsString()
  @MaxLength(255)
  canonicalName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @Type(() => String)
  tags?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OntologyAliasDto)
  aliases: OntologyAliasDto[] = [];
}

export class UpsertSkillOntologyDto {
  @IsString()
  @MaxLength(50)
  version!: string;

  @IsString()
  @MaxLength(255)
  source!: string;

  @IsOptional()
  @IsString()
  revisionNotes?: string;

  @IsOptional()
  @IsBoolean()
  activate?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OntologySkillDto)
  skills!: OntologySkillDto[];
}

export class CreateOntologyVersionDto {
  @IsString()
  @MaxLength(50)
  version!: string;

  @IsString()
  @MaxLength(255)
  source!: string;

  @IsOptional()
  @IsBoolean()
  activate?: boolean;

  @IsOptional()
  @IsString()
  revisionNotes?: string;
}
