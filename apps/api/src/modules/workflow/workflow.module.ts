import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { RequirementsModule } from "../requirements/requirements.module";
import { SubmissionsModule } from "../submissions/submissions.module";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";

@Module({
  imports: [RequirementsModule, SubmissionsModule, NotificationsModule],
  controllers: [WorkflowController],
  providers: [WorkflowService]
})
export class WorkflowModule {}



