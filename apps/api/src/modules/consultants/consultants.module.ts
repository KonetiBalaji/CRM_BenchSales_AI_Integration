import { Module } from "@nestjs/common";

import { DedupeModule } from "../dedupe/dedupe.module";
import { ConsultantsController } from "./consultants.controller";
import { ConsultantsService } from "./consultants.service";

@Module({
  imports: [DedupeModule],
  controllers: [ConsultantsController],
  providers: [ConsultantsService]
})
export class ConsultantsModule {}
