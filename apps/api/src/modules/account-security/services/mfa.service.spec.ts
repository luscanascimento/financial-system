import { createHash } from 'node:crypto';

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { MfaRecoveryCode, User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UsersRepository } from '../../users/users.repository';
import type { MfaRecoveryCodeRepository } from '../repositories/mfa-recovery-code.repository';
import { MfaService } from './mfa.service';
import { generateHotp } from './totp';

// A fixed Base32 secret (RFC 6238 reference) lets us derive a valid, current
// TOTP code deterministically for the enable/verify assertions.
const FIXED_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // "12345678901234567890"

const baseUser: User = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'jane@financehub.dev',
  passwordHash: 'argon2-hash',
  displayName: 'Jane Doe',
  role: 'USER',
  emailVerified: true,
  mfaEnabled: false,
  mfaSecret: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

/** Produces a TOTP code valid for the current 30s step and `secret`. */
function currentCode(secret: string): string {
  const counter = Math.floor(Date.now() / 1000 / 30);
  return generateHotp(secret, counter);
}

const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

function setup() {
  const users = {
    findById: vi.fn(),
    update: vi.fn().mockResolvedValue(baseUser),
  } as unknown as UsersRepository;

  const recoveryCodes = {
    createMany: vi.fn().mockResolvedValue(undefined),
    findUnusedByUser: vi.fn().mockResolvedValue([]),
    markUsed: vi.fn().mockResolvedValue(undefined),
    deleteByUser: vi.fn().mockResolvedValue(undefined),
  } as unknown as MfaRecoveryCodeRepository;

  return {
    service: new MfaService(users, recoveryCodes),
    users,
    recoveryCodes,
  };
}

describe('MfaService', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  describe('setup', () => {
    it('stores a pending secret and returns a provisioning URI', async () => {
      vi.mocked(ctx.users.findById).mockResolvedValue(baseUser);

      const result = await ctx.service.setup(baseUser.id);

      expect(result.secret).toMatch(/^[A-Z2-7]+$/);
      expect(result.otpauthUri).toContain('otpauth://totp/');
      expect(ctx.users.update).toHaveBeenCalledWith(baseUser.id, {
        mfaSecret: result.secret,
        mfaEnabled: false,
      });
    });
  });

  describe('enable', () => {
    it('activates MFA and mints 10 recovery codes for a valid code', async () => {
      vi.mocked(ctx.users.findById).mockResolvedValue({
        ...baseUser,
        mfaSecret: FIXED_SECRET,
      });

      const result = await ctx.service.enable(
        baseUser.id,
        currentCode(FIXED_SECRET),
      );

      expect(result.recoveryCodes).toHaveLength(10);
      const stored = vi.mocked(ctx.recoveryCodes.createMany).mock.calls[0];
      expect(stored[1]).toHaveLength(10);
      // Only hashes are persisted — never the plaintext codes.
      for (const hash of stored[1]) {
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
        expect(result.recoveryCodes).not.toContain(hash);
      }
      expect(ctx.users.update).toHaveBeenCalledWith(baseUser.id, {
        mfaEnabled: true,
      });
    });

    it('rejects an invalid code', async () => {
      vi.mocked(ctx.users.findById).mockResolvedValue({
        ...baseUser,
        mfaSecret: FIXED_SECRET,
      });
      await expect(
        ctx.service.enable(baseUser.id, '000000'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects when setup has not run', async () => {
      vi.mocked(ctx.users.findById).mockResolvedValue(baseUser);
      await expect(
        ctx.service.enable(baseUser.id, '000000'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('verify', () => {
    it('accepts a current TOTP code', async () => {
      vi.mocked(ctx.users.findById).mockResolvedValue({
        ...baseUser,
        mfaEnabled: true,
        mfaSecret: FIXED_SECRET,
      });

      await expect(
        ctx.service.verify(baseUser.id, currentCode(FIXED_SECRET)),
      ).resolves.toBe(true);
    });

    it('accepts and burns a valid unused recovery code', async () => {
      const recoveryCode = 'a1b2c3d4e5';
      vi.mocked(ctx.users.findById).mockResolvedValue({
        ...baseUser,
        mfaEnabled: true,
        mfaSecret: FIXED_SECRET,
      });
      vi.mocked(ctx.recoveryCodes.findUnusedByUser).mockResolvedValue([
        {
          id: 'rc-1',
          userId: baseUser.id,
          codeHash: sha256(recoveryCode),
          usedAt: null,
          createdAt: new Date(),
        } as MfaRecoveryCode,
      ]);

      await expect(ctx.service.verify(baseUser.id, recoveryCode)).resolves.toBe(
        true,
      );
      expect(ctx.recoveryCodes.markUsed).toHaveBeenCalledWith('rc-1');
    });

    it('rejects an unknown code', async () => {
      vi.mocked(ctx.users.findById).mockResolvedValue({
        ...baseUser,
        mfaEnabled: true,
        mfaSecret: FIXED_SECRET,
      });
      await expect(ctx.service.verify(baseUser.id, '000000')).resolves.toBe(
        false,
      );
    });
  });

  describe('disable', () => {
    it('clears the secret, recovery codes and flag after a valid code', async () => {
      vi.mocked(ctx.users.findById).mockResolvedValue({
        ...baseUser,
        mfaEnabled: true,
        mfaSecret: FIXED_SECRET,
      });

      await ctx.service.disable(baseUser.id, currentCode(FIXED_SECRET));

      expect(ctx.recoveryCodes.deleteByUser).toHaveBeenCalledWith(baseUser.id);
      expect(ctx.users.update).toHaveBeenCalledWith(baseUser.id, {
        mfaEnabled: false,
        mfaSecret: null,
      });
    });

    it('rejects an invalid code', async () => {
      vi.mocked(ctx.users.findById).mockResolvedValue({
        ...baseUser,
        mfaEnabled: true,
        mfaSecret: FIXED_SECRET,
      });
      await expect(
        ctx.service.disable(baseUser.id, '000000'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
