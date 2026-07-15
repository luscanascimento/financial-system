import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';
import { NotificationService } from '../../core/services/notification.service';

/** Sets a new password using the single-use token from the reset email link. */
@Component({
  selector: 'fh-reset-password',
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
            <mat-icon aria-hidden="true">password</mat-icon>
            <span>FinanceHub</span>
          </div>
          <h1>Choose a new password</h1>

          @if (!token) {
            <p>This reset link is invalid or has expired.</p>
            <div class="fh-auth__actions">
              <a
                mat-flat-button
                color="primary"
                routerLink="/auth/forgot-password"
              >
                Request a new link
              </a>
            </div>
          } @else {
            <form
              class="fh-auth__form"
              [formGroup]="form"
              (ngSubmit)="submit()"
            >
              <mat-form-field appearance="outline">
                <mat-label>New password</mat-label>
                <input
                  matInput
                  type="password"
                  formControlName="password"
                  autocomplete="new-password"
                />
                @if (form.controls.password.hasError('minlength')) {
                  <mat-error>Use at least 8 characters</mat-error>
                }
              </mat-form-field>
              <div class="fh-auth__actions">
                <button
                  mat-flat-button
                  color="primary"
                  type="submit"
                  [disabled]="submitting()"
                >
                  Update password
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
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  protected readonly token = this.route.snapshot.queryParamMap.get('token');
  protected readonly submitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected submit(): void {
    if (this.form.invalid || this.submitting() || !this.token) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.http
      .post(`${environment.apiBaseUrl}/auth/reset-password`, {
        token: this.token,
        password: this.form.getRawValue().password,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.notifications.success('Password updated — you can sign in now');
          void this.router.navigate(['/auth/login']);
        },
        error: () => this.submitting.set(false),
      });
  }
}
