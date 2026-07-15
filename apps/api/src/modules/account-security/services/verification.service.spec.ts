import { createHash } from 'node:crypto';

import { NotFoundException } from '@nestjs/common';
import type { User, VerificationToken } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MailService } from '../../mail/mail.service';
import type { PasswordService } from '../../auth/services/password.service';
import type { UsersRepository } from '../../users/users.repository';
import type { VerificationTokenRepository } from '../repositories/verification-token.repository';
import { VerificationService } from './verification.service';

const demoUser: User = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'jane@financehub.dev',
  passwordHash: 'argon2-hash',
  displayName: 'Jane Doe',
  role: 'USER',
  emailVerified: false,
  mfaEnabled: false,
  mfaSecret: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

function setup() {
  const tokens = {
    create: vi.fn(),
    findByHash: vi.fn(),
    consume: vi.fn(),
  } as unknown as VerificationTokenRepository;

  const users = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    update: vi.fn().mockResolvedValue(demoUser),
  } as unknown as UsersRepository;

  const passwords = {
    hash: vi.fn().mockResolvedValue('new-argon2-hash'),
  } as unknown as PasswordService;

  const mail = {
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  } as unknown as MailService;

  return {
    service: new VerificationService(tokens, users, passwords, mail),
    tokens,
    users,
    passwords,
    mail,
  };
}

describe('VerificationService', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  describe('requestEmailVerification', () => {
    it('persists a hashed token and emails the link', async () => {
      vi.mocked(ctx.users.findById).mockResolvedValue(demoUser);

      await ctx.service.requestEmailVerification(demoUser.id);

      const created = vi.mocked(ctx.tokens.create).mock.calls[0][0];
      expect(created.type).toBe('EMAIL_VERIFY');
      expect(created.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(ctx.mail.sendVerificationEmail).toHaveBeenCalledWith(
        demoUser.email,
        expect.any(String),
      );
    });

    it('throws when the user is unknown', async () => {
      vi.mocked(ctx.users.findById).mockResolvedValue(null);
      await expect(
        ctx.service.requestEmailVerification('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('verifyEmail', () => {
    it('consumes a valid token and marks the email verified', async () => {
      const raw = 'raw-verify-token';
      const token = {
        id: 'tok-1',
        userId: demoUser.id,
        type: 'EMAIL_VERIFY',
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
        createdAt: new Date(),
      } as VerificationToken;
      vi.mocked(ctx.tokens.findByHash).mockResolvedValue(token);

      await ctx.service.verifyEmail(raw);

      expect(ctx.tokens.findByHash).toHaveBeenCalledWith(
        sha256(raw),
        'EMAIL_VERIFY',
      );
      expect(ctx.tokens.consume).toHaveBeenCalledWith('tok-1');
      expect(ctx.users.update).toHaveBeenCalledWith(demoUser.id, {
        emailVerified: true,
      });
    });

    it('rejects an unknown token', async () => {
      vi.mocked(ctx.tokens.findByHash).mockResolvedValue(null);
      await expect(ctx.service.verifyEmail('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects an expired token', async () => {
      vi.mocked(ctx.tokens.findByHash).mockResolvedValue({
        id: 'tok-1',
        userId: demoUser.id,
        type: 'EMAIL_VERIFY',
        tokenHash: 'x',
        expiresAt: new Date(Date.now() - 1000),
        consumedAt: null,
        createdAt: new Date(),
      } as VerificationToken);
      await expect(ctx.service.verifyEmail('raw')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(ctx.tokens.consume).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('always resolves without leaking whether the user exists', async () => {
      vi.mocked(ctx.users.findByEmail).mockResolvedValue(null);
      await expect(
        ctx.service.forgotPassword('ghost@financehub.dev'),
      ).resolves.toBeUndefined();
      expect(ctx.tokens.create).not.toHaveBeenCalled();
      expect(ctx.mail.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('issues a reset token and emails it for a real user', async () => {
      vi.mocked(ctx.users.findByEmail).mockResolvedValue(demoUser);

      await ctx.service.forgotPassword(demoUser.email);

      const created = vi.mocked(ctx.tokens.create).mock.calls[0][0];
      expect(created.type).toBe('PASSWORD_RESET');
      expect(ctx.mail.sendPasswordResetEmail).toHaveBeenCalledWith(
        demoUser.email,
        expect.any(String),
      );
    });
  });

  describe('resetPassword', () => {
    it('hashes the new password and consumes the token', async () => {
      const raw = 'raw-reset-token';
      vi.mocked(ctx.tokens.findByHash).mockResolvedValue({
        id: 'tok-2',
        userId: demoUser.id,
        type: 'PASSWORD_RESET',
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
        createdAt: new Date(),
      } as VerificationToken);

      await ctx.service.resetPassword(raw, 'brand-new-pass');

      expect(ctx.passwords.hash).toHaveBeenCalledWith('brand-new-pass');
      expect(ctx.tokens.consume).toHaveBeenCalledWith('tok-2');
      expect(ctx.users.update).toHaveBeenCalledWith(demoUser.id, {
        passwordHash: 'new-argon2-hash',
      });
    });

    it('rejects an expired reset token', async () => {
      vi.mocked(ctx.tokens.findByHash).mockResolvedValue(null);
      await expect(
        ctx.service.resetPassword('nope', 'brand-new-pass'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
