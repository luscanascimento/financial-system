import { createHash, randomBytes } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';

import { MailService } from '../../mail/mail.service';
import { PasswordService } from '../../auth/services/password.service';
import { UsersRepository } from '../../users/users.repository';
import { VerificationTokenRepository } from '../repositories/verification-token.repository';

/** How long an email-verification token stays valid. */
const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
/** How long a password-reset token stays valid. */
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Handles email verification and password recovery via single-use, hashed
 * tokens. Raw tokens are only ever emailed to the user; the database stores
 * their SHA-256 hash, so a database leak cannot be replayed.
 */
@Injectable()
export class VerificationService {
  constructor(
    private readonly tokens: VerificationTokenRepository,
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
    private readonly mail: MailService,
  ) {}

  /** Issues a fresh EMAIL_VERIFY token for the user and emails the link. */
  async requestEmailVerification(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const rawToken = this.generateRawToken();
    await this.tokens.create({
      userId: user.id,
      type: 'EMAIL_VERIFY',
      tokenHash: this.hash(rawToken),
      expiresAt: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
    });
    await this.mail.sendVerificationEmail(user.email, rawToken);
  }

  /** Consumes an EMAIL_VERIFY token and marks the owner's email as verified. */
  async verifyEmail(rawToken: string): Promise<void> {
    const token = await this.tokens.findByHash(
      this.hash(rawToken),
      'EMAIL_VERIFY',
    );
    if (!token || token.expiresAt.getTime() < Date.now()) {
      throw new NotFoundException('Invalid or expired verification token');
    }
    await this.tokens.consume(token.id);
    await this.users.update(token.userId, { emailVerified: true });
  }

  /**
   * Starts the password-reset flow. Always resolves (never reveals whether the
   * email exists) — a token is only issued and emailed when the user is real.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      return;
    }
    const rawToken = this.generateRawToken();
    await this.tokens.create({
      userId: user.id,
      type: 'PASSWORD_RESET',
      tokenHash: this.hash(rawToken),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    });
    await this.mail.sendPasswordResetEmail(user.email, rawToken);
  }

  /** Consumes a PASSWORD_RESET token and stores the new hashed password. */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const token = await this.tokens.findByHash(
      this.hash(rawToken),
      'PASSWORD_RESET',
    );
    if (!token || token.expiresAt.getTime() < Date.now()) {
      throw new NotFoundException('Invalid or expired reset token');
    }
    const passwordHash = await this.passwords.hash(newPassword);
    await this.tokens.consume(token.id);
    await this.users.update(token.userId, { passwordHash });
  }

  /** Generates a high-entropy, URL-safe raw token. */
  private generateRawToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
