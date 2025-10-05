import { PartialType } from "@nestjs/mapped-types";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";

import { ConsultantAvailability } from "@prisma/client";

class SkillInput {
  @IsString()
  id!: string;

  @IsNumber()
  @Min(0)
  weight!: number;
}

export class CreateConsultantDto {
  @IsString()
  tenantId!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(ConsultantAvailability)
  availability?: ConsultantAvailability;

  @IsOptional()
  @IsNumber()
  rate?: number;

  @IsOptional()
  @IsNumber()
  experience?: number;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillInput)
  skills: SkillInput[] = [];
}

export class UpdateConsultantDto extends PartialType(CreateConsultantDto) {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillInput)
  override skills?: SkillInput[];
}
