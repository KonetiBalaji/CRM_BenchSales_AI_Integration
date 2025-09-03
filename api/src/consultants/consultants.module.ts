// Bench Sales CRM API - Consultants Module
// Created by Balaji Koneti
// This module configures the consultants feature

import { Module } from '@nestjs/common';
import { ConsultantsService } from './consultants.service';
import { ConsultantsController } from './consultants.controller';

@Module({ 
  controllers: [ConsultantsController], 
  providers: [ConsultantsService] 
})
export class ConsultantsModule {}
