/**
 * @fileoverview Data Visualization Module
 * 
 * This module provides data visualization functionality for the CRM BenchSales AI Integration application.
 * It includes dashboard creation, chart generation, and interactive reporting capabilities.
 * 
 * Key features:
 * - Interactive dashboard creation
 * - Chart and graph generation
 * - Real-time data visualization
 * - Custom report builders
 * - Data export capabilities
 * - Role-based access control
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Module } from "@nestjs/common";

import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { DataVisualizationController } from "./data-visualization.controller";
import { DataVisualizationService } from "./data-visualization.service";

@Module({
  imports: [PrismaModule],
  controllers: [DataVisualizationController],
  providers: [DataVisualizationService],
  exports: [DataVisualizationService]
})
export class DataVisualizationModule {}
