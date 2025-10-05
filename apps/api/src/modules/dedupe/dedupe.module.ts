import { Module } from "@nestjs/common";

import { DedupeController } from "./dedupe.controller";
import { DedupeService } from "./dedupe.service";

@Module({
  controllers: [DedupeController],
  providers: [DedupeService],
  exports: [DedupeService]
})
export class DedupeModule {}
