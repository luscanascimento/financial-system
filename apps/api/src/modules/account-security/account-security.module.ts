import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AccountRecoveryController } from './account-recovery.controller';
import { MfaController } from './mfa.controller';
import { MfaRecoveryCodeRepository } from './repositories/mfa-recovery-code.repository';
import { VerificationTokenRepository } from './repositories/verification-token.repository';
import { MfaService } from './services/mfa.service';
import { VerificationService } from './services/verification.service';

/**
 * Completes the authentication surface with email verification, password
 * recovery and TOTP multi-factor authentication. Depends on {@link UsersModule}
 * for `UsersRepository`, {@link AuthModule} for `PasswordService` and
 * {@link MailModule} for outbound email.
 */
@Module({
  imports: [MailModule, UsersModule, AuthModule],
  controllers: [AccountRecoveryController, MfaController],
  providers: [
    VerificationService,
    MfaService,
    VerificationTokenRepository,
    MfaRecoveryCodeRepository,
  ],
  exports: [VerificationService, MfaService],
})
export class AccountSecurityModule {}
