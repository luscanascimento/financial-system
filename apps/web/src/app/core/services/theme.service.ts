import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'financehub.theme';

/**
 * Owns the application's light/dark theme. Backed by a signal so components can
 * react declaratively; the preference is persisted to `localStorage` and the
 * `dark` class is toggled on `<html>` to drive the Material `color-scheme`.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly mode = signal<ThemeMode>(this.readInitialMode());

  /** Current theme mode. */
  readonly theme = this.mode.asReadonly();
  /** Convenience flag for templates. */
  readonly isDark = computed(() => this.mode() === 'dark');

  constructor() {
    // Keep the DOM and persisted preference in sync with the signal.
    effect(() => {
      const mode = this.mode();
      const root = this.document.documentElement;
      root.classList.toggle('dark', mode === 'dark');
      this.persist(mode);
    });
  }

  toggle(): void {
    this.mode.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  private readInitialMode(): ThemeMode {
    const stored = this.safeGetStored();
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    const prefersDark = this.document.defaultView?.matchMedia?.(
      '(prefers-color-scheme: dark)',
    ).matches;
    return prefersDark ? 'dark' : 'light';
  }

  private safeGetStored(): string | null {
    try {
      return this.document.defaultView?.localStorage.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private persist(mode: ThemeMode): void {
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage may be unavailable (e.g. private mode); ignore.
    }
  }
}
