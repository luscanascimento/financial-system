import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { LoginResponse } from '@financehub/shared-types';

import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

/**
 * Email/password sign-in. Redirects to the originally requested URL (or the
 * dashboard) on success and surfaces a friendly hint when MFA is required.
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

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
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

  private onResponse(res: LoginResponse): void {
    this.submitting.set(false);
    if ('mfaRequired' in res) {
      this.notifications.info(
        'Multi-factor authentication is enabled for this account.',
      );
      return;
    }
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
