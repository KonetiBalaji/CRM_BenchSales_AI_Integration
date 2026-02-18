/**
 * Email Notification Processor
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('email-notification')
export class EmailNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailNotificationProcessor.name);

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing email notification job ${job.id}`);
    
    const { to, subject, template, context } = job.data;

    try {
      // Email sending - configure SendGrid or AWS SES for production
      this.logger.log(`Would send email to ${to} with subject: ${subject}`);

      return { success: true, to };
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }
}
