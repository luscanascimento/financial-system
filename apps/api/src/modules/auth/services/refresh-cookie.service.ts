import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import type { AppConfiguration } from '../../../config/configuration';

/**
 * Encapsulates the refresh-token cookie contract. The cookie is httpOnly (no JS
 * access), Secure in production, SameSite=strict, and scoped to the auth routes
 * so it is only ever sent to `/api/auth/*`.
 */
@Injectable()
export class RefreshCookieService {
  static readonly COOKIE_NAME = 'fh_refresh';
  private static readonly COOKIE_PATH = '/api/auth';

  private readonly secure: boolean;

  constructor(configService: ConfigService<AppConfiguration, true>) {
    this.secure = configService.get('app.isProduction', { infer: true });
  }

  set(response: Response, token: string, expiresAt: Date): void {
    response.cookie(RefreshCookieService.COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'strict',
      path: RefreshCookieService.COOKIE_PATH,
      expires: expiresAt,
    });
  }

  clear(response: Response): void {
    response.clearCookie(RefreshCookieService.COOKIE_NAME, {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'strict',
      path: RefreshCookieService.COOKIE_PATH,
    });
  }

  extract(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, string> | undefined;
    return cookies?.[RefreshCookieService.COOKIE_NAME];
  }
}
