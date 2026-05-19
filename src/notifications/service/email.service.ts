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

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    const smtp = this.configService.get('smtp', { infer: true });
    this.fromAddress = smtp.from ?? 'ConduPro <no-reply@condupro.local>';

    if (smtp.host && smtp.port) {
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth:
          smtp.user && smtp.pass
            ? {
                user: smtp.user,
                pass: smtp.pass,
              }
            : undefined,
      });
      this.logger.log(`SMTP configurado (${smtp.host}:${smtp.port})`);
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

    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });

    this.logger.log(`Correo enviado a ${to}: ${content.subject}`);
  }
}
