import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { AuthResult, LoginResponse } from '@financehub/shared-types';

import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

/**
 * Email/password sign-in. When the account has MFA enabled the server returns a
 * challenge instead of a session and the form switches to a one-time-code step;
 * only that second call yields tokens. Redirects to the originally requested URL
 * (or the dashboard) on success.
 */
@Component({
  selector: 'fh-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);

  protected readonly submitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  /** The pending MFA challenge, or null while collecting credentials. */
  protected readonly mfaToken = signal<string | null>(null);

  protected readonly code = this.fb.nonNullable.control('', [
    Validators.required,
  ]);

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    const pendingMfa = this.mfaToken();
    if (pendingMfa) {
      this.submitMfaCode(pendingMfa);
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (res) => this.onResponse(res),
      error: () => this.submitting.set(false),
    });
  }

  private submitMfaCode(mfaToken: string): void {
    if (this.code.invalid) {
      this.code.markAsTouched();
      return;
    }
    this.submitting.set(true);
    this.auth.verifyMfaChallenge(mfaToken, this.code.value.trim()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.onAuthenticated(res);
      },
      error: () => this.submitting.set(false),
    });
  }

  private onResponse(res: LoginResponse): void {
    this.submitting.set(false);
    if ('mfaRequired' in res) {
      this.mfaToken.set(res.mfaToken);
      this.code.reset();
      this.notifications.info(
        'Enter the code from your authenticator app to finish signing in.',
      );
      return;
    }
    this.onAuthenticated(res);
  }

  private onAuthenticated(res: AuthResult): void {
    this.notifications.success(`Welcome back, ${res.user.displayName}`);
    void this.router.navigateByUrl(this.safeRedirect());
  }

  /**
   * Resolves the post-login redirect. Only same-origin, in-app relative paths
   * are honoured — a crafted `?redirectTo=https://evil.example` (or
   * protocol-relative `//evil`) is ignored to prevent open-redirect / phishing.
   */
  private safeRedirect(): string {
    const target = this.route.snapshot.queryParamMap.get('redirectTo');
    if (target && /^\/(?!\/)/.test(target)) {
      return target;
    }
    return '/dashboard';
  }
}
