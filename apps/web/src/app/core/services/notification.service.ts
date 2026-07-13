import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Thin wrapper over Material's snackbar, giving the app a single, consistent
 * entry point for toast notifications (success / error / info).
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.open(message, 'fh-snackbar--success');
  }

  error(message: string): void {
    this.open(message, 'fh-snackbar--error', 6000);
  }

  info(message: string): void {
    this.open(message, 'fh-snackbar--info');
  }

  private open(message: string, panelClass: string, duration = 4000): void {
    this.snackBar.open(message, 'Dismiss', {
      duration,
      panelClass,
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}
