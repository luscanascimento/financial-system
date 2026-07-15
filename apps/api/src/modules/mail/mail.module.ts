import { Global, Module } from '@nestjs/common';

import { MailService } from './mail.service';

/**
 * Provides the application-wide email gateway. Declared `@Global` so any module
 * can inject {@link MailService} without importing MailModule explicitly.
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
