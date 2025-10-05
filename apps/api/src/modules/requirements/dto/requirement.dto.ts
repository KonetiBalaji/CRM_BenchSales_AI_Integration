import { PartialType } from "@nestjs/mapped-types";
import { Type } from "class-transformer";
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";

import { RequirementSource, RequirementStatus, RequirementType } from "@prisma/client";

class RequirementSkillInput {
  @IsString()
  id!: string;

  @IsNumber()
  @Min(0)
  weight!: number;
}

export class CreateRequirementDto {
  @IsString()
  tenantId!: string;

  @IsString()
  title!: string;

  @IsString()
  clientName!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(RequirementType)
  type?: RequirementType;

  @IsOptional()
  @IsEnum(RequirementStatus)
  status?: RequirementStatus;

  @IsOptional()
  @IsEnum(RequirementSource)
  source?: RequirementSource;

  @IsOptional()
  @IsNumber()
  minRate?: number;

  @IsOptional()
  @IsNumber()
  maxRate?: number;

  @IsOptional()
  @IsDateString()
  closesAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequirementSkillInput)
  skills: RequirementSkillInput[] = [];
}

export class UpdateRequirementDto extends PartialType(CreateRequirementDto) {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequirementSkillInput)
  override skills?: RequirementSkillInput[];
}
