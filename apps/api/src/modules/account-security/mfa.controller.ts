import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthResult } from '@financehub/shared-types';
import type { Request, Response } from 'express';

import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RefreshCookieService } from '../auth/services/refresh-cookie.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { MfaChallengeDto } from './dto/mfa-challenge.dto';
import { MfaCodeDto } from './dto/mfa-code.dto';
import {
  MfaService,
  type MfaEnableResult,
  type MfaSetupResult,
} from './services/mfa.service';

/**
 * TOTP MFA: the public login challenge (`POST /auth/mfa/challenge`) plus
 * authenticated management for the current user — provision, enable, disable
 * and verify, each scoped to `@CurrentUser`.
 */
@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfa: MfaService,
    private readonly auth: AuthService,
    private readonly refreshCookie: RefreshCookieService,
  ) {}

  /**
   * Second leg of an MFA login. Throttled hard — this is the only place a
   * 6-digit code can be guessed.
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('challenge')
  @ApiOperation({ summary: 'Complete a login that requires a second factor' })
  async challenge(
    @Body() dto: MfaChallengeDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResult> {
    const userId = await this.mfa.consumeLoginChallenge(dto.mfaToken, dto.code);
    const session = await this.auth.issueSessionFor(userId, {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });
    this.refreshCookie.set(
      response,
      session.refreshToken,
      session.refreshExpiresAt,
    );
    return session.result;
  }

  @HttpCode(HttpStatus.OK)
  @Post('setup')
  @ApiOperation({
    summary: 'Generate a pending MFA secret and provisioning URI',
  })
  setup(@CurrentUser() user: AuthenticatedUser): Promise<MfaSetupResult> {
    return this.mfa.setup(user.userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('enable')
  @ApiOperation({ summary: 'Enable MFA and receive one-time recovery codes' })
  enable(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MfaCodeDto,
  ): Promise<MfaEnableResult> {
    return this.mfa.enable(user.userId, dto.code);
  }

  @HttpCode(HttpStatus.OK)
  @Post('disable')
  @ApiOperation({ summary: 'Disable MFA after verifying a current code' })
  async disable(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MfaCodeDto,
  ): Promise<{ success: true }> {
    await this.mfa.disable(user.userId, dto.code);
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify')
  @ApiOperation({ summary: 'Verify a TOTP or recovery code' })
  async verify(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MfaCodeDto,
  ): Promise<{ valid: boolean }> {
    const valid = await this.mfa.verify(user.userId, dto.code);
    return { valid };
  }
}
