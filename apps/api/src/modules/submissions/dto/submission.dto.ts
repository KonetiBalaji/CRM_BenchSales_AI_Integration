import { Type } from "class-transformer";
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";

import { InterviewMode, SubmissionStatus } from "@prisma/client";

class InterviewInput {
  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  interviewer?: string;

  @IsOptional()
  @IsEnum(InterviewMode)
  mode?: InterviewMode;
}

export class CreateSubmissionDto {
  @IsString()
  consultantId!: string;

  @IsString()
  requirementId!: string;

  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;

  @IsOptional()
  notes?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewInput)
  interviews?: InterviewInput[];
}

export class UpdateSubmissionStatusDto {
  @IsEnum(SubmissionStatus)
  status!: SubmissionStatus;
}
