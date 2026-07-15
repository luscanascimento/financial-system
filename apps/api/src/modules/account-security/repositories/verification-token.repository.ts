import { Injectable } from '@nestjs/common';
import type { Prisma, TokenType, VerificationToken } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

/**
 * Persistence gateway for single-use, hashed verification tokens (email
 * verification and password reset). The only place feature code touches the
 * Prisma `verificationToken` model.
 */
@Injectable()
export class VerificationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.VerificationTokenUncheckedCreateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<VerificationToken> {
    return tx.verificationToken.create({ data });
  }

  /** Looks up an unconsumed token by its SHA-256 hash and expected type. */
  findByHash(
    tokenHash: string,
    type: TokenType,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<VerificationToken | null> {
    return tx.verificationToken.findFirst({
      where: { tokenHash, type, consumedAt: null },
    });
  }

  /** Marks a token as consumed so it can never be replayed. */
  async consume(
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await tx.verificationToken.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }
}
