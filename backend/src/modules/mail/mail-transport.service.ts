import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { MailMessage } from './entities/mail-message.entity.js';

@Injectable()
export class MailTransportService implements OnModuleDestroy {
  private readonly logger = new Logger(MailTransportService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const enabled = config.get<string>('MAIL_ENABLED', 'false') === 'true';
    const host = config.get<string>('SMTP_HOST', '');
    this.from = config.get<string>('MAIL_FROM', '');
    this.transporter = null;
    if (!enabled) {
      this.logger.warn('Gửi email đang tắt; thư được giữ trong hàng đợi đến khi MAIL_ENABLED=true.');
      return;
    }
    if (!host || !this.from || /[\r\n]/.test(this.from)) {
      throw new Error('MAIL_ENABLED=true yêu cầu SMTP_HOST và MAIL_FROM hợp lệ');
    }
    const port = Number(config.get<string>('SMTP_PORT', '587'));
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SMTP_PORT không hợp lệ');
    const user = config.get<string>('SMTP_USER', '');
    const pass = config.get<string>('SMTP_PASSWORD', '');
    if (!!user !== !!pass) throw new Error('Cần cấu hình cả SMTP_USER và SMTP_PASSWORD');
    this.transporter = nodemailer.createTransport({
      host, port, secure: config.get<string>('SMTP_SECURE', String(port === 465)) === 'true',
      requireTLS: config.get<string>('SMTP_REQUIRE_TLS', 'true') === 'true',
      ...(user ? { auth: { user, pass } } : {}),
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
      disableFileAccess: true, disableUrlAccess: true,
    });
  }

  get enabled(): boolean { return this.transporter !== null; }

  async send(message: MailMessage): Promise<void> {
    if (!this.transporter) throw new Error('Gửi email chưa được bật');
    const result = await this.transporter.sendMail({
      from: this.from, to: { address: message.recipient, name: '' },
      // Stable Message-ID helps mail servers recognize retried submissions.
      messageId: `<${message.id}@tour-management.mail>`, subject: message.subject,
      text: message.text, html: message.html,
      ...(message.attachmentName ? { attachments: [{ filename: message.attachmentName, content: message.html, contentType: 'text/html; charset=utf-8' }] } : {}),
    });
    if (!result.accepted?.length) throw new Error('SMTP không chấp nhận người nhận');
  }

  onModuleDestroy(): void { this.transporter?.close(); }
}
