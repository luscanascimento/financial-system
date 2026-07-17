import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

import type { AppConfiguration } from '../../../config/configuration';

/**
 * Password hashing and verification using Argon2id — a memory-hard algorithm
 * recommended by OWASP. Parameters follow current guidance; tune per hardware.
 *
 * Argon2 already generates a unique per-hash salt. On top of that, an optional
 * application-side **pepper** (`PASSWORD_PEPPER`) is mixed in via Argon2's keyed
 * `secret`: a value held outside the database, so a database-only breach still
 * leaves the hashes infeasible to attack offline. The pepper must remain
 * stable — rotating it invalidates every existing hash.
 */
@Injectable()
export class PasswordService {
  private readonly options: argon2.Options;

  constructor(configService: ConfigService<AppConfiguration, true>) {
    const pepper = configService.get('security.passwordPepper', {
      infer: true,
    });
    this.options = {
      type: argon2.argon2id,
      memoryCost: 19_456, // 19 MiB
      timeCost: 2,
      parallelism: 1,
      ...(pepper ? { secret: Buffer.from(pepper, 'utf8') } : {}),
    };
  }

  hash(plain: string): Promise<string> {
    return argon2.hash(plain, this.options);
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      // The keyed `secret` (pepper) must be supplied at verification too.
      return await argon2.verify(hash, plain, this.options);
    } catch {
      // Malformed hash or verification error — treat as a non-match.
      return false;
    }
  }
}
