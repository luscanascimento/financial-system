import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';

import { MfaCodeDto } from './mfa-code.dto';

/**
 * Completes a login that returned an MFA challenge: the short-lived token
 * issued by `POST /auth/login` plus the user's second factor.
 */
export class MfaChallengeDto extends MfaCodeDto {
  @ApiProperty({
    description:
      'The short-lived `mfaToken` returned by POST /auth/login when the account requires MFA.',
  })
  @IsJWT()
  mfaToken!: string;
}
