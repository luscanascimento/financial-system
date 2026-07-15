import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  AuthResult,
  AuthUser,
  LoginResponse,
} from '@financehub/shared-types';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SKIP_ERROR_NOTIFICATION } from '../interceptors/error.interceptor';

export interface RegisterPayload {
  email: string;
  displayName: string;
  password: string;
}

/**
 * Owns the authenticated session on the client. The access token is held in
 * memory only (never in localStorage) — the rotating refresh token lives in an
 * httpOnly cookie the browser sends automatically to `/auth/refresh`. On app
 * start we attempt a silent refresh to restore a session across reloads.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  private accessToken: string | null = null;

  private readonly user = signal<AuthUser | null>(null);
  /** The current authenticated user, or null. */
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);

  /** True once the initial silent-refresh probe has resolved. */
  private readonly ready = signal(false);
  readonly initialized = this.ready.asReadonly();

  getAccessToken(): string | null {
    return this.accessToken;
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, { email, password })
      .pipe(tap((res) => this.acceptSession(res)));
  }

  register(payload: RegisterPayload): Observable<AuthResult> {
    return this.http
      .post<AuthResult>(`${this.baseUrl}/register`, payload)
      .pipe(tap((res) => this.acceptSession(res)));
  }

  /** Rotates the refresh cookie and refreshes the in-memory access token. */
  refresh(): Observable<AuthResult> {
    return this.http
      .post<AuthResult>(
        `${this.baseUrl}/refresh`,
        {},
        { context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true) },
      )
      .pipe(tap((res) => this.acceptSession(res)));
  }

  logout(): Observable<{ success: true }> {
    return this.http
      .post<{ success: true }>(`${this.baseUrl}/logout`, {})
      .pipe(tap(() => this.clearSession()));
  }

  /**
   * Attempts to restore a session from the refresh cookie at startup. Resolves
   * regardless of outcome so route guards can proceed once `initialized`.
   */
  restoreSession(): Observable<AuthResult | null> {
    return new Observable<AuthResult | null>((subscriber) => {
      this.refresh().subscribe({
        next: (res) => {
          subscriber.next(res);
          subscriber.complete();
        },
        error: () => {
          this.ready.set(true);
          subscriber.next(null);
          subscriber.complete();
        },
      });
    });
  }

  private acceptSession(res: LoginResponse | AuthResult): void {
    if ('mfaRequired' in res) {
      // MFA challenges are handled by the login page; no session yet.
      return;
    }
    this.accessToken = res.accessToken;
    this.user.set(res.user);
    this.ready.set(true);
  }

  private clearSession(): void {
    this.accessToken = null;
    this.user.set(null);
  }
}
