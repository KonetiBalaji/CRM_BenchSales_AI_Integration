// Bench Sales CRM API - Prisma Database Module
// Created by Balaji Koneti
// This module provides global database connectivity via Prisma

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Make this module available globally
@Module({ 
  providers: [PrismaService], 
  exports: [PrismaService] 
})
export class PrismaModule {}
