// Bench Sales CRM API - Update Consultant DTO
// Created by Balaji Koneti
// This DTO extends the create DTO to allow partial updates

import { PartialType } from '@nestjs/mapped-types';
import { CreateConsultantDto } from './create-consultant.dto';

export class UpdateConsultantDto extends PartialType(CreateConsultantDto) {}
