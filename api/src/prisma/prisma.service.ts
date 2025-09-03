// Bench Sales CRM API - Prisma Database Service
// Created by Balaji Koneti
// This service manages database connections and lifecycle hooks

import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  
  // Connect to database when module initializes
  async onModuleInit() {
    await this.$connect();
    console.log('🔌 Connected to PostgreSQL database');
  }
  
  // Enable graceful shutdown hooks
  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => { 
      await app.close(); 
    });
  }
}
