import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import type { AppConfig } from '../../config/configuration';
import type { EmailContent } from '../templates/email-templates';

export interface SendEmailParams {
  to: string;
  content: EmailContent;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly fromAddress: string;
  /** Cola global: un solo envío SMTP a la vez (evita 550 por segundo en Mailtrap). */
  private smtpSendChain: Promise<void> = Promise.resolve();
  private lastSmtpCompletedAt = 0;
  private readonly smtpMinIntervalMs: number;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    const smtp = this.configService.get('smtp', { infer: true });
    this.fromAddress = smtp.from ?? 'ConduPro <no-reply@condupro.local>';
    const raw = smtp.minIntervalMs;
    this.smtpMinIntervalMs = Number.isFinite(raw) ? Math.min(60_000, Math.max(500, raw)) : 2100;

    const hasCredentials = Boolean(smtp.user?.trim() && smtp.pass?.trim());

    if (smtp.host && smtp.port && hasCredentials) {
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: {
          user: smtp.user!,
          pass: smtp.pass!,
        },
      });
      this.logger.log(`SMTP configurado (${smtp.host}:${smtp.port})`);
    } else if (smtp.host && smtp.port) {
      this.logger.warn(
        `SMTP ${smtp.host}:${smtp.port} sin SMTP_USER/SMTP_PASS — los correos se registrarán en consola`,
      );
    } else {
      this.logger.warn('SMTP no configurado — los correos se registrarán en consola');
    }
  }

  async send(params: SendEmailParams): Promise<void> {
    const { to, content } = params;

    if (!this.transporter) {
      this.logger.log(
        `[EMAIL-DEV] To: ${to} | Subject: ${content.subject}\n${content.text}`,
      );
      return;
    }

    const job = this.smtpSendChain.then(async () => {
      if (this.lastSmtpCompletedAt > 0) {
        const elapsed = Date.now() - this.lastSmtpCompletedAt;
        if (elapsed < this.smtpMinIntervalMs) {
          await delay(this.smtpMinIntervalMs - elapsed);
        }
      }

      const msIntoSecond = Date.now() % 1000;
      if (msIntoSecond > 850) {
        await delay(1000 - msIntoSecond + 120);
      }

      try {
        await this.transporter!.sendMail({
          from: this.fromAddress,
          to,
          subject: content.subject,
          text: content.text,
          html: content.html,
        });

        this.logger.log(`Correo enviado a ${to}: ${content.subject}`);
      } finally {
        this.lastSmtpCompletedAt = Date.now();
      }
    });

    this.smtpSendChain = job.catch(() => undefined);
    await job;
  }
}
