import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UsersRepository } from '../users/users.repository';
import { AuthService } from './auth.service';
import type { PasswordService } from './services/password.service';
import type { TokenService } from './services/token.service';

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

function setup() {
  const users = {
    existsByEmail: vi.fn(),
    create: vi.fn(),
    findByEmail: vi.fn(),
    findById: vi.fn(),
  } as unknown as UsersRepository;

  const passwords = {
    hash: vi.fn().mockResolvedValue('argon2-hash'),
    verify: vi.fn(),
  } as unknown as PasswordService;

  const tokens = {
    signAccessToken: vi.fn().mockResolvedValue('access.jwt'),
    issueRefreshToken: vi.fn().mockResolvedValue({
      rawToken: 'raw-refresh',
      expiresAt: new Date('2026-01-08T00:00:00.000Z'),
      record: { id: 'rt-1' },
    }),
    rotateRefreshToken: vi.fn(),
    accessTtlSeconds: 900,
  } as unknown as TokenService;

  return { service: new AuthService(users, passwords, tokens), users, passwords, tokens };
}

describe('AuthService', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  describe('register', () => {
    it('rejects a duplicate email', async () => {
      vi.mocked(ctx.users.existsByEmail).mockResolvedValue(true);
      await expect(ctx.service.register(
        { email: demoUser.email, displayName: 'Jane', password: 'password123' },
        {},
      )).rejects.toBeInstanceOf(ConflictException);
    });

    it('hashes the password and issues a session', async () => {
      vi.mocked(ctx.users.existsByEmail).mockResolvedValue(false);
      vi.mocked(ctx.users.create).mockResolvedValue(demoUser);

      const session = await ctx.service.register(
        { email: demoUser.email, displayName: 'Jane Doe', password: 'password123' },
        {},
      );

      expect(ctx.passwords.hash).toHaveBeenCalledWith('password123');
      expect(session.result.accessToken).toBe('access.jwt');
      expect(session.result.user.email).toBe(demoUser.email);
      expect(session.refreshToken).toBe('raw-refresh');
    });
  });

  describe('login', () => {
    it('rejects an unknown email', async () => {
      vi.mocked(ctx.users.findByEmail).mockResolvedValue(null);
      await expect(
        ctx.service.login({ email: 'nope@x.dev', password: 'x' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong password', async () => {
      vi.mocked(ctx.users.findByEmail).mockResolvedValue(demoUser);
      vi.mocked(ctx.passwords.verify).mockResolvedValue(false);
      await expect(
        ctx.service.login({ email: demoUser.email, password: 'wrong' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('issues a session on valid credentials', async () => {
      vi.mocked(ctx.users.findByEmail).mockResolvedValue(demoUser);
      vi.mocked(ctx.passwords.verify).mockResolvedValue(true);

      const session = await ctx.service.login(
        { email: demoUser.email, password: 'password123' },
        {},
      );

      expect(session.result.user.id).toBe(demoUser.id);
      expect(session.result.expiresIn).toBe(900);
    });
  });

  describe('refresh', () => {
    it('rotates and re-issues tokens for a valid session', async () => {
      vi.mocked(ctx.tokens.rotateRefreshToken).mockResolvedValue({
        userId: demoUser.id,
        issued: {
          rawToken: 'raw-refresh-2',
          expiresAt: new Date('2026-01-09T00:00:00.000Z'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          record: { id: 'rt-2' } as any,
        },
      });
      vi.mocked(ctx.users.findById).mockResolvedValue(demoUser);

      const session = await ctx.service.refresh('raw-refresh', {});

      expect(session.result.accessToken).toBe('access.jwt');
      expect(session.refreshToken).toBe('raw-refresh-2');
    });
  });
});
