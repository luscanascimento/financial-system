/** Authentication & authorization contracts shared by the API and web app. */

export type Role = 'USER' | 'ADMIN';

export type OAuthProvider = 'GOOGLE' | 'GITHUB';

/** The authenticated user projection returned to clients (never includes secrets). */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  emailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
}

/** Access token payload returned on login/refresh (refresh token lives in an httpOnly cookie). */
export interface AccessTokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

/** Successful authentication result. */
export interface AuthResult extends AccessTokenResponse {
  user: AuthUser;
}

/** When MFA is enabled, login returns a challenge instead of tokens. */
export interface MfaChallenge {
  mfaRequired: true;
  mfaToken: string;
}

export type LoginResponse = AuthResult | MfaChallenge;

/** Decoded JWT access-token claims. */
export interface JwtClaims {
  sub: string;
  email: string;
  role: Role;
}
