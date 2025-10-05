import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IngestionStatus, RequirementSource, DocumentAssetType, Prisma } from "@prisma/client";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { createHash } from "node:crypto";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { DocumentsService } from "../documents/documents.service";
import { IngestionConfig, EmailIngestionConfig } from "./ingestion.types";
import { IngestionQueueService } from "./ingestion.queue";

@Injectable()
export class EmailIngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailIngestionService.name);
  private readonly emailConfig: EmailIngestionConfig;
  private client: ImapFlow | null = null;
  private pollHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly documents: DocumentsService,
    private readonly queue: IngestionQueueService,
    private readonly prisma: PrismaService
  ) {
    const ingestion = (this.configService.get<IngestionConfig>("ingestion") ?? {}) as IngestionConfig;
    this.emailConfig = ingestion.email ?? {
      enabled: false,
      mailbox: "INBOX",
      pollIntervalMs: 60_000,
      attachmentMimeWhitelist: ["application/pdf"],
      defaultTenantId: "demo-tenant"
    };
  }

  async onModuleInit() {
    if (!this.emailConfig.enabled) {
      this.logger.log("Email ingestion disabled");
      return;
    }

    try {
      await this.connect();
      await this.pollMailbox();
      this.pollHandle = setInterval(() => this.safePoll(), this.emailConfig.pollIntervalMs);
    } catch (error) {
      this.logger.error(`Failed to initialize IMAP ingestion: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
    if (this.client) {
      try { await this.client.logout(); } catch {}
      try { await this.client.close(); } catch {}
      this.client = null;
    }
  }

  private async connect() {
    const { host, port, secure, user, password, mailbox } = this.emailConfig;
    if (!host || !user || !password) {
      throw new Error("IMAP configuration incomplete");
    }
    this.client = new ImapFlow({
      host,
      port: port ?? 993,
      secure: secure ?? true,
      auth: { user, pass: password }
    });
    await this.client.connect();
    await this.client.mailboxOpen(mailbox ?? "INBOX");
    this.logger.log(`Connected to IMAP mailbox ${mailbox ?? "INBOX"}`);
  }

  private async safePoll() {
    try {
      await this.pollMailbox();
    } catch (error) {
      this.logger.error(`Email ingestion poll failure: ${(error as Error).message}`);
      if (!this.client || !this.client.usable) {
        await this.reconnect();
      }
    }
  }

  private async reconnect() {
    await this.onModuleDestroy();
    await this.connect();
  }

  private async pollMailbox() {
    if (!this.client) {
      return;
    }
    const mailbox = this.emailConfig.mailbox ?? "INBOX";
    const lock = await this.client.getMailboxLock(mailbox);
    try {
      const unseen = (await this.client.search({ seen: false })) as unknown as number[];
      for (const seq of unseen) {
        const message: any = await this.client.fetchOne(seq, { uid: true, source: true, envelope: true } as any);
        if (!message || !(message as any).source) {
          continue;
        }
        await this.processMessage((message as any).source as Buffer, (message.envelope && message.envelope.subject) ? String(message.envelope.subject) : undefined);
        if ((message as any).uid) {
          await this.client.messageFlagsAdd({ uid: (message as any).uid }, ["\\Seen"] as any);
        }
      }
    } finally {
      lock.release();
    }
  }

  private async processMessage(source: Buffer, subject?: string) {
    const tenantId = this.emailConfig.defaultTenantId ?? "demo-tenant";
    const parsed = await simpleParser(source);
    const html = typeof parsed.html === "string" ? parsed.html : "";
    const textContent = parsed.text ?? this.stripHtml(html);

    if (textContent.trim().length > 50) {
      await this.enqueueRequirementIngestion(tenantId, textContent, subject ?? parsed.subject ?? "");
    }

    const whitelist = new Set(
      (this.emailConfig.attachmentMimeWhitelist ?? ["application/pdf"]).map((item) => item.toLowerCase())
    );

    if (parsed.attachments?.length) {
      for (const attachment of parsed.attachments) {
        const contentType = attachment.contentType?.toLowerCase() ?? "application/octet-stream";
        if (!whitelist.has(contentType)) {
          continue;
        }
        const buffer = Buffer.isBuffer(attachment.content)
          ? (attachment.content as Buffer)
          : Buffer.from(attachment.content as Uint8Array);
        const fileName = attachment.filename ?? `attachment-${Date.now()}`;

        const result = await this.documents.ingestBinary(tenantId, {
          buffer,
          fileName,
          contentType,
          kind: DocumentAssetType.RESUME
        });

        if (!result.duplicate) {
          await this.queue.enqueueResume({
            tenantId,
            documentId: result.document.id,
            storageKey: result.document.storageKey,
            fileName: result.document.fileName,
            contentType: result.document.contentType,
            source: "email"
          });
        }
      }
    }
  }

  private async enqueueRequirementIngestion(tenantId: string, content: string, subject: string) {
    const contentHash = createHash("md5").update(content).digest("hex");
    const existing = await this.prisma.requirementIngestion.findUnique({
      where: {
        tenantId_contentHash: {
          tenantId,
          contentHash
        }
      }
    });

    if (existing) {
      return existing.id;
    }

    const ingestion = await this.prisma.requirementIngestion.create({
      data: {
        tenantId,
        source: RequirementSource.EMAIL,
        rawContent: content,
        contentHash,
        status: IngestionStatus.PENDING,
        parsedData: { subject } as Prisma.InputJsonValue
      }
    });
    await this.queue.enqueueRequirement({ tenantId, ingestionId: ingestion.id });
    return ingestion.id;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  }
}
