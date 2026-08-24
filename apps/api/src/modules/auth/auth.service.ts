import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import type { MfaChallenge } from '@financehub/shared-types';

import { toAuthUser } from '../users/mappers/user.mapper';
import { UsersRepository } from '../users/users.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './services/password.service';
import { TokenService, type SessionContext } from './services/token.service';
import type { IssuedSession } from './types/session';

/**
 * Orchestrates authentication use-cases (register, login, refresh, logout).
 * Delegates hashing to {@link PasswordService}, token issuance/rotation to
 * {@link TokenService} and persistence to repositories — keeping each concern
 * single-responsibility.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async register(
    dto: RegisterDto,
    context: SessionContext,
  ): Promise<IssuedSession> {
    if (await this.users.existsByEmail(dto.email)) {
      throw new ConflictException('Email is already registered');
    }
    const passwordHash = await this.passwords.hash(dto.password);
    const user = await this.users.create({
      email: dto.email,
      displayName: dto.displayName,
      passwordHash,
    });
    return this.issueSession(user, context);
  }

  /**
   * Verifies credentials. When the account has MFA enabled no session is
   * issued — the caller gets a short-lived challenge it must answer at
   * `POST /auth/mfa/challenge` before any token is handed out.
   */
  async login(
    dto: LoginDto,
    context: SessionContext,
  ): Promise<IssuedSession | MfaChallenge> {
    const user = await this.users.findByEmail(dto.email);
    // Constant-ish response regardless of which check fails (avoid user enumeration).
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await this.passwords.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.mfaEnabled) {
      return {
        mfaRequired: true,
        mfaToken: await this.tokens.signMfaToken(user.id),
      };
    }
    return this.issueSession(user, context);
  }

  async refresh(
    rawRefreshToken: string,
    context: SessionContext,
  ): Promise<IssuedSession> {
    const { userId, issued } = await this.tokens.rotateRefreshToken(
      rawRefreshToken,
      context,
    );
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const accessToken = await this.tokens.signAccessToken(user);
    return {
      result: {
        user: toAuthUser(user),
        accessToken,
        tokenType: 'Bearer',
        expiresIn: this.tokens.accessTtlSeconds,
      },
      refreshToken: issued.rawToken,
      refreshExpiresAt: issued.expiresAt,
    };
  }

  /**
   * Issues a session for an already-authenticated user id. Used to complete a
   * login after the second factor has been verified.
   */
  async issueSessionFor(
    userId: string,
    context: SessionContext,
  ): Promise<IssuedSession> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid MFA token');
    }
    return this.issueSession(user, context);
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (rawRefreshToken) {
      await this.tokens.revoke(rawRefreshToken);
    }
  }

  private async issueSession(
    user: User,
    context: SessionContext,
  ): Promise<IssuedSession> {
    const accessToken = await this.tokens.signAccessToken(user);
    const issued = await this.tokens.issueRefreshToken(user.id, context);
    return {
      result: {
        user: toAuthUser(user),
        accessToken,
        tokenType: 'Bearer',
        expiresIn: this.tokens.accessTtlSeconds,
      },
      refreshToken: issued.rawToken,
      refreshExpiresAt: issued.expiresAt,
    };
  }
}
