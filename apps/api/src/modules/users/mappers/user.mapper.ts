import type { AuthUser } from '@financehub/shared-types';
import type { User } from '@prisma/client';

/**
 * Maps the persistence `User` entity to the public {@link AuthUser} projection,
 * dropping secrets (password hash, MFA secret) that must never leave the API.
 */
export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    emailVerified: user.emailVerified,
    mfaEnabled: user.mfaEnabled,
    createdAt: user.createdAt.toISOString(),
  };
}
