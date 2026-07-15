import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * A TOTP code or one-time recovery code supplied to confirm an MFA operation.
 * Accepts 6-digit TOTP codes as well as longer alphanumeric recovery codes.
 */
export class MfaCodeDto {
  @ApiProperty({
    example: '123456',
    description: 'A 6-digit TOTP code or an unused recovery code.',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'code must be alphanumeric (dashes allowed)',
  })
  code!: string;
}
