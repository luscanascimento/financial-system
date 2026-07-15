import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { MfaCodeDto } from './dto/mfa-code.dto';
import {
  MfaService,
  type MfaEnableResult,
  type MfaSetupResult,
} from './services/mfa.service';

/**
 * Authenticated TOTP MFA management for the current user: provision, enable,
 * disable and verify. Every operation is scoped to `@CurrentUser`.
 */
@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth/mfa')
export class MfaController {
  constructor(private readonly mfa: MfaService) {}

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
