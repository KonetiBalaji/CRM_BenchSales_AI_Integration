// Bench Sales CRM API - Root Application Module
// Created by Balaji Koneti
// This module imports and configures all application modules

import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConsultantsModule } from './consultants/consultants.module';

@Module({
  imports: [
    PrismaModule,      // Database connection module
    ConsultantsModule,  // Consultants CRUD module
  ],
})
export class AppModule {}
