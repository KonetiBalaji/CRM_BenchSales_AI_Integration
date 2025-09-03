// Bench Sales CRM API - Main Application Entry Point
// Created by Balaji Koneti
// This file bootstraps the NestJS application

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Create the NestJS application instance
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for web app communication
  app.enableCors({ 
    origin: process.env.CORS_ORIGIN?.split(',') ?? true 
  });
  
  // Get port from environment or use default
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  
  // Start the application
  await app.listen(port);
  
  console.log(`🚀 Bench Sales CRM API running on port ${port}`);
  console.log(`📧 Mailhog available at http://localhost:8025`);
}

bootstrap();
