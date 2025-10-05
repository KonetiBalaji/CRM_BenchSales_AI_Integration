import { IsOptional, IsString } from "class-validator";

export class CreateTenantDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  domain?: string;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  domain?: string;
}
