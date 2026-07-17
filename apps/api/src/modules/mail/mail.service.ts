import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfiguration } from '../../config/configuration';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Outbound email gateway. The development transport simply logs the rendered
 * message via the Nest {@link Logger} — no SMTP dependency — so the auth flows
 * are exercisable end-to-end without external infrastructure. Swap the
 * {@link send} implementation for a real provider in production.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  /** Base URL of the web app, used to build user-facing action links. */
  private readonly webUrl: string;

  constructor(configService: ConfigService<AppConfiguration, true>) {
    this.webUrl = configService.get('app.webUrl', { infer: true });
  }

  /** Delivers a message. The dev transport logs it and resolves to void. */
  async send(message: MailMessage): Promise<void> {
    this.logger.log(
      `[mail] to=${message.to} subject="${message.subject}"\n${message.text}`,
    );
  }

  /** Sends the single-use email-verification link. */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const link = `${this.webUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;
    await this.send({
      to: email,
      subject: 'Verify your FinanceHub email',
      text: `Confirm your email address by visiting: ${link}\n\nThis link expires in 24 hours.`,
      html: `<p>Confirm your email address by clicking <a href="${link}">this link</a>.</p><p>This link expires in 24 hours.</p>`,
    });
  }

  /** Sends the single-use password-reset link. */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const link = `${this.webUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
    await this.send({
      to: email,
      subject: 'Reset your FinanceHub password',
      text: `Reset your password by visiting: ${link}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
      html: `<p>Reset your password by clicking <a href="${link}">this link</a>.</p><p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
    });
  }
}
