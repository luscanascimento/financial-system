import { createHash, randomBytes } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/client';

import { CryptoService } from '../../../common/crypto/crypto.service';
import type { AppConfiguration } from '../../../config/configuration';
import { UsersRepository } from '../../users/users.repository';
import { MfaRecoveryCodeRepository } from '../repositories/mfa-recovery-code.repository';
import { generateSecret, totpUri, verifyTotp } from './totp';

/** Number of one-time recovery codes minted when MFA is enabled. */
const RECOVERY_CODE_COUNT = 10;

export interface MfaSetupResult {
  /** The Base32 shared secret (also embedded in `otpauthUri`). */
  secret: string;
  /** The `otpauth://` provisioning URI to render as a QR code. */
  otpauthUri: string;
}

export interface MfaEnableResult {
  /** Plaintext recovery codes — returned exactly once, never stored in clear. */
  recoveryCodes: string[];
}

/**
 * Manages TOTP-based multi-factor authentication: provisioning a secret,
 * enabling it after proof of possession, disabling it and verifying codes
 * (TOTP or one-time recovery codes) during login. All operations are scoped to
 * a single user.
 */
@Injectable()
export class MfaService {
  private readonly issuer: string;

  constructor(
    private readonly users: UsersRepository,
    private readonly recoveryCodes: MfaRecoveryCodeRepository,
    private readonly crypto: CryptoService,
    configService: ConfigService<AppConfiguration, true>,
  ) {
    this.issuer = configService.get('mfa.issuer', { infer: true });
  }

  /**
   * Generates a pending secret and stores it on the user, leaving MFA disabled
   * until the user proves possession via {@link enable}. The secret is
   * encrypted (AES-256-GCM) before it touches the database.
   */
  async setup(userId: string): Promise<MfaSetupResult> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const secret = generateSecret();
    await this.users.update(user.id, {
      mfaSecret: this.crypto.encrypt(secret),
      mfaEnabled: false,
    });
    return { secret, otpauthUri: totpUri(secret, user.email, this.issuer) };
  }

  /**
   * Activates MFA after verifying a TOTP code against the pending secret, then
   * mints and returns one-time recovery codes (plaintext, once only).
   */
  async enable(userId: string, code: string): Promise<MfaEnableResult> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const secret = this.readSecret(user);
    if (!secret) {
      throw new BadRequestException('MFA setup has not been started');
    }
    if (!verifyTotp(secret, code)) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    const plaintextCodes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
      this.generateRecoveryCode(),
    );
    await this.recoveryCodes.deleteByUser(user.id);
    await this.recoveryCodes.createMany(
      user.id,
      plaintextCodes.map((value) => this.hash(value)),
    );
    await this.users.update(user.id, { mfaEnabled: true });

    return { recoveryCodes: plaintextCodes };
  }

  /**
   * Deactivates MFA after verifying a current code, clearing the secret and all
   * recovery codes.
   */
  async disable(userId: string, code: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled');
    }
    if (!(await this.verify(userId, code))) {
      throw new UnauthorizedException('Invalid MFA code');
    }
    await this.recoveryCodes.deleteByUser(user.id);
    await this.users.update(user.id, { mfaEnabled: false, mfaSecret: null });
  }

  /**
   * Verifies a login-time factor: a valid TOTP code, or a valid unused recovery
   * code (which is burned on success). Returns `true` on a match.
   */
  async verify(userId: string, code: string): Promise<boolean> {
    const user = await this.users.findById(userId);
    if (!user) {
      return false;
    }
    const secret = this.readSecret(user);
    if (!secret) {
      return false;
    }
    if (verifyTotp(secret, code)) {
      return true;
    }
    // Fall back to one-time recovery codes.
    const candidateHash = this.hash(code.trim());
    const unused = await this.recoveryCodes.findUnusedByUser(user.id);
    const match = unused.find((entry) =>
      this.hashesEqual(entry.codeHash, candidateHash),
    );
    if (!match) {
      return false;
    }
    await this.recoveryCodes.markUsed(match.id);
    return true;
  }

  /**
   * Reads the user's TOTP secret, decrypting the at-rest envelope. Values
   * predating encryption are returned as-is (transparent legacy fallback), so
   * existing enrolments keep working and are re-encrypted on the next setup.
   */
  private readSecret(user: User): string | null {
    if (!user.mfaSecret) {
      return null;
    }
    return this.crypto.decryptOrPassthrough(user.mfaSecret);
  }

  /** Generates a human-friendly recovery code (10 hex chars, e.g. `a1b2c3d4e5`). */
  private generateRecoveryCode(): string {
    return randomBytes(5).toString('hex');
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /** Constant-time comparison of two equal-length hex hashes. */
  private hashesEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }
}
