import { IsNumber, IsOptional } from "class-validator";

export class MatchRequestDto {
  @IsOptional()
  @IsNumber()
  topN?: number = 5;
}
