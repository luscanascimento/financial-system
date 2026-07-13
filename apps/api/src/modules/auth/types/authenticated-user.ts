import type { Role } from '@financehub/shared-types';

/**
 * The principal attached to `request.user` after a successful JWT validation.
 * Kept minimal — full user data is fetched from the repository when needed.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
}
