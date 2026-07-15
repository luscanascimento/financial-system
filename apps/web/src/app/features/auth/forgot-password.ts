import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';

/** Requests a password-reset email. Always reports success (no user enumeration). */
@Component({
  selector: 'fh-forgot-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="fh-auth">
      <mat-card class="fh-auth__card" appearance="outlined">
        <mat-card-content>
          <div class="fh-auth__brand">
            <mat-icon aria-hidden="true">lock_reset</mat-icon>
            <span>FinanceHub</span>
          </div>
          <h1>Reset your password</h1>

          @if (sent()) {
            <p>
              If an account exists for that email, we've sent a link to reset
              your password. Check your inbox (and your spam folder).
            </p>
            <div class="fh-auth__actions">
              <a mat-flat-button color="primary" routerLink="/auth/login">
                Back to sign in
              </a>
            </div>
          } @else {
            <p>Enter your email and we'll send you a reset link.</p>
            <form
              class="fh-auth__form"
              [formGroup]="form"
              (ngSubmit)="submit()"
            >
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" />
                @if (form.controls.email.hasError('email')) {
                  <mat-error>Enter a valid email</mat-error>
                }
              </mat-form-field>
              <div class="fh-auth__actions">
                <button
                  mat-flat-button
                  color="primary"
                  type="submit"
                  [disabled]="submitting()"
                >
                  Send reset link
                </button>
              </div>
            </form>
            <div class="fh-auth__links">
              <a routerLink="/auth/login">Back to sign in</a>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.http
      .post(
        `${environment.apiBaseUrl}/auth/forgot-password`,
        this.form.getRawValue(),
      )
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.sent.set(true);
        },
        error: () => {
          this.submitting.set(false);
          this.sent.set(true);
        },
      });
  }
}
