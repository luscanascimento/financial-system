import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Application root. Intentionally thin: it only hosts the routed outlet. The
 * authenticated chrome (sidenav, toolbar) lives in {@link MainLayout}, while the
 * auth pages render full-screen without it.
 */
@Component({
  selector: 'fh-root',
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class App {}
