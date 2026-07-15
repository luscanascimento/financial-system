import { HttpClient, HttpContext } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';
import { SKIP_ERROR_NOTIFICATION } from '../../core/interceptors/error.interceptor';

type VerifyState = 'verifying' | 'success' | 'error';

/** Confirms an email address from the token in the verification link. */
@Component({
  selector: 'fh-verify-email',
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="fh-auth">
      <mat-card class="fh-auth__card" appearance="outlined">
        <mat-card-content>
          <div class="fh-auth__brand">
            <mat-icon aria-hidden="true">mark_email_read</mat-icon>
            <span>FinanceHub</span>
          </div>
          @switch (state()) {
            @case ('verifying') {
              <h1>Verifying your email…</h1>
              <div class="fh-spinner-overlay">
                <mat-spinner diameter="40" />
              </div>
            }
            @case ('success') {
              <h1>Email verified</h1>
              <p>Your email address has been confirmed. Thank you!</p>
              <div class="fh-auth__actions">
                <a mat-flat-button color="primary" routerLink="/dashboard">
                  Go to dashboard
                </a>
              </div>
            }
            @case ('error') {
              <h1>Verification failed</h1>
              <p>This link is invalid or has expired.</p>
              <div class="fh-auth__actions">
                <a mat-stroked-button routerLink="/auth/login"
                  >Back to sign in</a
                >
              </div>
            }
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class VerifyEmail {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  protected readonly state = signal<VerifyState>('verifying');

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('error');
      return;
    }
    this.http
      .post(
        `${environment.apiBaseUrl}/auth/verify-email`,
        { token },
        { context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true) },
      )
      .subscribe({
        next: () => this.state.set('success'),
        error: () => this.state.set('error'),
      });
  }
}
