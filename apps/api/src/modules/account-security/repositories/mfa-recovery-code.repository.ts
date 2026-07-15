import { Injectable } from '@nestjs/common';
import type { MfaRecoveryCode, Prisma } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

/**
 * Persistence gateway for hashed one-time MFA recovery codes. The only place
 * feature code touches the Prisma `mfaRecoveryCode` model.
 */
@Injectable()
export class MfaRecoveryCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Persists a freshly generated batch of hashed recovery codes for a user. */
  async createMany(
    userId: string,
    codeHashes: string[],
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await tx.mfaRecoveryCode.createMany({
      data: codeHashes.map((codeHash) => ({ userId, codeHash })),
    });
  }

  /** Returns the user's recovery codes that have not been used yet. */
  findUnusedByUser(
    userId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<MfaRecoveryCode[]> {
    return tx.mfaRecoveryCode.findMany({
      where: { userId, usedAt: null },
    });
  }

  /** Burns a recovery code so it can only ever be redeemed once. */
  async markUsed(
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await tx.mfaRecoveryCode.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  /** Removes every recovery code for a user (used when MFA is disabled). */
  async deleteByUser(
    userId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await tx.mfaRecoveryCode.deleteMany({ where: { userId } });
  }
}
