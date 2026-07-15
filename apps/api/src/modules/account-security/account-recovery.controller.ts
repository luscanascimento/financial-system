import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerificationService } from './services/verification.service';

/**
 * Public/authenticated account-recovery endpoints: email verification and the
 * forgot/reset-password flow.
 */
@ApiTags('Auth')
@Controller('auth')
export class AccountRecoveryController {
  constructor(private readonly verification: VerificationService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  @ApiOperation({
    summary: 'Confirm an email address using a verification token',
  })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ success: true }> {
    await this.verification.verifyEmail(dto.token);
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('resend-verification')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend the email-verification link' })
  async resendVerification(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: true }> {
    await this.verification.requestEmailVerification(user.userId);
    return { success: true };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password-reset link (always succeeds)' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ success: true }> {
    await this.verification.forgotPassword(dto.email);
    return { success: true };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset the password using a reset token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ success: true }> {
    await this.verification.resetPassword(dto.token, dto.password);
    return { success: true };
  }
}
