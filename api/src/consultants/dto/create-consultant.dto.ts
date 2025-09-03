// Bench Sales CRM API - Create Consultant DTO
// Created by Balaji Koneti
// This DTO validates incoming data for creating consultants

import { IsArray, IsBoolean, IsEmail, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateConsultantDto {
  @IsString() 
  name: string;
  
  @IsOptional() 
  @IsEmail() 
  email?: string;
  
  @IsOptional() 
  @IsString() 
  phone?: string;
  
  @IsOptional() 
  @IsString() 
  primarySkill?: string;
  
  @IsOptional() 
  @IsArray() 
  skills?: string[];
  
  @IsOptional() 
  @IsString() 
  visaStatus?: string;
  
  @IsOptional() 
  @IsString() 
  location?: string;
  
  @IsOptional() 
  @IsInt() 
  rateMin?: number;
  
  @IsOptional() 
  @IsBoolean() 
  remoteOk?: boolean;
}
