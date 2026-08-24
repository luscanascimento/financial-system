import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { JwtClaims } from '@financehub/shared-types';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AppConfiguration } from '../../../config/configuration';
import { MFA_TOKEN_TYPE } from '../services/token.service';
import type { AuthenticatedUser } from '../types/authenticated-user';

/**
 * Validates the bearer access token and maps its claims onto `request.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService<AppConfiguration, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.accessSecret', { infer: true }),
    });
  }

  validate(payload: JwtClaims & { typ?: string }): AuthenticatedUser {
    // A pending-MFA token is signed with the same secret but is not a session.
    if (payload.typ === MFA_TOKEN_TYPE) {
      throw new UnauthorizedException('Invalid access token');
    }
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
