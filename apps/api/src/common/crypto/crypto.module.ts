import { Global, Module } from '@nestjs/common';

import { CryptoService } from './crypto.service';

/**
 * Exposes the application-wide {@link CryptoService} for encrypting sensitive
 * data at rest. Declared `@Global` so any feature module can inject it without
 * an explicit import.
 */
@Global()
@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}
