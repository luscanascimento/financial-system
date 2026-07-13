import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import type { HealthCheckResponse } from '@financehub/shared-types';
import { of } from 'rxjs';

import { HealthService } from '../../core/services/health.service';
import { Dashboard } from './dashboard';

const healthyResponse: HealthCheckResponse = {
  status: 'ok',
  details: {
    database: { status: 'up' },
    redis: { status: 'up' },
  },
};

describe('Dashboard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideNoopAnimations(),
        { provide: HealthService, useValue: { check: () => of(healthyResponse) } },
      ],
    }).compileComponents();
  });

  it('renders the KPI cards', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();

    const values = fixture.nativeElement.querySelectorAll('.fh-kpi');
    expect(values.length).toBe(4);
  });

  it('shows dependency statuses once loaded', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.fh-status__item');
    expect(items.length).toBe(2);
  });
});
