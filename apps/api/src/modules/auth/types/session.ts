import type { AuthResult } from '@financehub/shared-types';

/**
 * Internal result of issuing a session. The controller returns `result` to the
 * client and writes `refreshToken` into an httpOnly cookie — the raw refresh
 * token never appears in a response body.
 */
export interface IssuedSession {
  result: AuthResult;
  refreshToken: string;
  refreshExpiresAt: Date;
}
