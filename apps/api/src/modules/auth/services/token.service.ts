import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { RefreshToken } from '@prisma/client';
import type { JwtClaims, Role } from '@financehub/shared-types';
import { parseDurationMs } from '@financehub/shared-utils';

import type { AppConfiguration } from '../../../config/configuration';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';

interface AccessSubject {
  id: string;
  email: string;
  role: Role;
}

export interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
}

export interface IssuedRefreshToken {
  rawToken: string;
  expiresAt: Date;
  record: RefreshToken;
}

export interface RotationResult {
  userId: string;
  issued: IssuedRefreshToken;
}

/**
 * `typ` claim marking a pending-MFA token. It is signed with the access-token
 * secret but is *not* a session credential — {@link JwtStrategy} refuses it.
 */
export const MFA_TOKEN_TYPE = 'mfa';

/** How long the client has to answer the MFA challenge. */
const MFA_TOKEN_TTL = '5m';

/**
 * Issues and validates auth tokens.
 *
 * - **Access tokens** are short-lived signed JWTs (stateless).
 * - **Refresh tokens** are high-entropy opaque strings, stored only as SHA-256
 *   hashes. They rotate on every use; presenting an already-rotated token is
 *   treated as theft and revokes the entire token family.
 */
@Injectable()
export class TokenService {
  private readonly jwtConfig: AppConfiguration['jwt'];

  constructor(
    private readonly jwtService: JwtService,
    private readonly refreshTokens: RefreshTokenRepository,
    configService: ConfigService<AppConfiguration, true>,
  ) {
    this.jwtConfig = configService.get('jwt', { infer: true });
  }

  signAccessToken(user: AccessSubject): Promise<string> {
    const payload: JwtClaims = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.signAsync(payload, {
      secret: this.jwtConfig.accessSecret,
      expiresIn: this.accessTtlSeconds,
    });
  }

  /**
   * Signs the short-lived token handed to the client when login stops at the
   * MFA gate. It carries no role/email claims and only unlocks
   * `POST /auth/mfa/challenge`.
   */
  signMfaToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, typ: MFA_TOKEN_TYPE },
      { secret: this.jwtConfig.accessSecret, expiresIn: MFA_TOKEN_TTL },
    );
  }

  /** Validates an MFA challenge token and returns the user it was minted for. */
  async verifyMfaToken(token: string): Promise<string> {
    let payload: { sub?: string; typ?: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.jwtConfig.accessSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA token');
    }
    if (payload.typ !== MFA_TOKEN_TYPE || !payload.sub) {
      throw new UnauthorizedException('Invalid or expired MFA token');
    }
    return payload.sub;
  }

  get accessTtlSeconds(): number {
    return Math.floor(parseDurationMs(this.jwtConfig.accessTtl) / 1000);
  }

  get refreshTtlMs(): number {
    return parseDurationMs(this.jwtConfig.refreshTtl);
  }

  async issueRefreshToken(
    userId: string,
    context: SessionContext & { familyId?: string } = {},
  ): Promise<IssuedRefreshToken> {
    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    const record = await this.refreshTokens.create({
      userId,
      tokenHash: this.hash(rawToken),
      familyId: context.familyId ?? randomUUID(),
      expiresAt,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });
    return { rawToken, expiresAt, record };
  }

  async rotateRefreshToken(
    rawToken: string,
    context: SessionContext = {},
  ): Promise<RotationResult> {
    const existing = await this.refreshTokens.findByHash(this.hash(rawToken));

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (existing.revokedAt) {
      // A revoked/rotated token was replayed — assume compromise.
      await this.refreshTokens.revokeFamily(existing.familyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (existing.expiresAt.getTime() < Date.now()) {
      await this.refreshTokens.revoke(existing.id);
      throw new UnauthorizedException('Refresh token expired');
    }

    const issued = await this.issueRefreshToken(existing.userId, {
      familyId: existing.familyId,
      ...context,
    });
    await this.refreshTokens.markRotated(existing.id, issued.record.id);

    return { userId: existing.userId, issued };
  }

  async revoke(rawToken: string): Promise<void> {
    const existing = await this.refreshTokens.findByHash(this.hash(rawToken));
    if (existing && !existing.revokedAt) {
      await this.refreshTokens.revoke(existing.id);
    }
  }

  private hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
