import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthResult } from '@financehub/shared-types';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshCookieService } from './services/refresh-cookie.service';
import type { SessionContext } from './services/token.service';
import type { IssuedSession } from './types/session';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly refreshCookie: RefreshCookieService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResult> {
    const session = await this.auth.register(dto, this.contextOf(request));
    return this.completeSession(session, response);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Authenticate and receive an access token' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResult> {
    const session = await this.auth.login(dto, this.contextOf(request));
    return this.completeSession(session, response);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResult> {
    const rawToken = this.refreshCookie.extract(request);
    if (!rawToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const session = await this.auth.refresh(rawToken, this.contextOf(request));
    return this.completeSession(session, response);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Revoke the current session' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ success: true }> {
    await this.auth.logout(this.refreshCookie.extract(request));
    this.refreshCookie.clear(response);
    return { success: true };
  }

  private completeSession(
    session: IssuedSession,
    response: Response,
  ): AuthResult {
    this.refreshCookie.set(
      response,
      session.refreshToken,
      session.refreshExpiresAt,
    );
    return session.result;
  }

  private contextOf(request: Request): SessionContext {
    return {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    };
  }
}
