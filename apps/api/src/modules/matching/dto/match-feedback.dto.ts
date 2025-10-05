import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export enum MatchFeedbackOutcomeOption {
  POSITIVE = "POSITIVE",
  NEGATIVE = "NEGATIVE",
  NEUTRAL = "NEUTRAL",
  HIRED = "HIRED",
  REJECTED = "REJECTED"
}

export class MatchFeedbackDto {
  @IsEnum(MatchFeedbackOutcomeOption)
  outcome!: MatchFeedbackOutcomeOption;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
