import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { RefreshToken } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppConfiguration } from '../../../config/configuration';
import type { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { TokenService } from './token.service';

function makeToken(overrides: Partial<RefreshToken> = {}): RefreshToken {
  return {
    id: 'rt-1',
    userId: 'user-1',
    tokenHash: 'hash',
    familyId: 'fam-1',
    userAgent: null,
    ipAddress: null,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    replacedByTokenId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

const jwtConfig = {
  get: vi.fn().mockReturnValue({
    accessSecret: 'access-secret',
    accessTtl: '15m',
    refreshSecret: 'refresh-secret',
    refreshTtl: '7d',
  }),
} as unknown as ConfigService<AppConfiguration, true>;

function setup() {
  const jwt = { signAsync: vi.fn().mockResolvedValue('access.jwt') } as unknown as JwtService;
  const repo = {
    create: vi.fn((data) => Promise.resolve(makeToken({ id: 'rt-new', ...data }))),
    findByHash: vi.fn(),
    markRotated: vi.fn(),
    revoke: vi.fn(),
    revokeFamily: vi.fn(),
  } as unknown as RefreshTokenRepository;
  return { service: new TokenService(jwt, repo, jwtConfig), repo };
}

describe('TokenService', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  it('exposes the access TTL in seconds', () => {
    expect(ctx.service.accessTtlSeconds).toBe(900);
  });

  it('rotates a valid refresh token and marks the old one replaced', async () => {
    vi.mocked(ctx.repo.findByHash).mockResolvedValue(makeToken({ id: 'rt-old' }));

    const result = await ctx.service.rotateRefreshToken('raw');

    expect(result.userId).toBe('user-1');
    expect(ctx.repo.markRotated).toHaveBeenCalledWith('rt-old', 'rt-new');
    expect(result.issued.rawToken).toEqual(expect.any(String));
  });

  it('rejects an unknown token', async () => {
    vi.mocked(ctx.repo.findByHash).mockResolvedValue(null);
    await expect(ctx.service.rotateRefreshToken('raw')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('detects reuse of a revoked token and nukes the family', async () => {
    vi.mocked(ctx.repo.findByHash).mockResolvedValue(
      makeToken({ revokedAt: new Date() }),
    );

    await expect(ctx.service.rotateRefreshToken('raw')).rejects.toThrow(
      /reuse detected/,
    );
    expect(ctx.repo.revokeFamily).toHaveBeenCalledWith('fam-1');
  });

  it('rejects an expired token', async () => {
    vi.mocked(ctx.repo.findByHash).mockResolvedValue(
      makeToken({ expiresAt: new Date(Date.now() - 1_000) }),
    );

    await expect(ctx.service.rotateRefreshToken('raw')).rejects.toThrow(
      /expired/,
    );
    expect(ctx.repo.revoke).toHaveBeenCalled();
  });

  describe('MFA challenge tokens', () => {
    /** Real JwtService — the round-trip is the point of these assertions. */
    const service = new TokenService(
      new JwtService({}),
      {} as RefreshTokenRepository,
      jwtConfig,
    );

    it('round-trips the user id', async () => {
      const token = await service.signMfaToken('user-1');
      await expect(service.verifyMfaToken(token)).resolves.toBe('user-1');
    });

    it('refuses a token that is not an MFA challenge', async () => {
      const accessToken = await service.signAccessToken({
        id: 'user-1',
        email: 'jane@financehub.dev',
        role: 'USER',
      });
      await expect(service.verifyMfaToken(accessToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('refuses a garbage token', async () => {
      await expect(service.verifyMfaToken('nope')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
