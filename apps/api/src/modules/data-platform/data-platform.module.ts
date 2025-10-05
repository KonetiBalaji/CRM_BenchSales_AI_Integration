import { Module } from "@nestjs/common";

import { DocumentsModule } from "../documents/documents.module";
import { DedupeModule } from "../dedupe/dedupe.module";
import { OntologyModule } from "../ontology/ontology.module";
import { DataPlatformController } from "./data-platform.controller";
import { DataPlatformService } from "./data-platform.service";

@Module({
  imports: [DocumentsModule, DedupeModule, OntologyModule],
  controllers: [DataPlatformController],
  providers: [DataPlatformService]
})
export class DataPlatformModule {}
