import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async notify(tenantId: string, message: { subject: string; body: string }) {
    this.logger.log(`[${tenantId}] ${message.subject} :: ${message.body}`);
    return { status: "ok" };
  }
}



