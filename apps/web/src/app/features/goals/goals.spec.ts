import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import type { Goal, Paginated } from '@financehub/shared-types';

import { environment } from '../../../environments/environment';
import { Goals } from './goals';

const goalsPage: Paginated<Goal> = {
  items: [
    {
      id: 'g1',
      name: 'Emergency fund',
      targetAmountMinor: 100000,
      currentAmountMinor: 25000,
      currency: 'USD',
      targetDate: null,
      accountId: null,
      color: null,
      icon: null,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  meta: {
    page: 1,
    pageSize: 20,
    totalItems: 1,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  },
};

describe('Goals', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Goals],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('renders a card for each loaded goal', () => {
    const fixture = TestBed.createComponent(Goals);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiBaseUrl}/goals`).flush(goalsPage);
    httpMock
      .match((req) => req.url === `${environment.apiBaseUrl}/accounts`)
      .forEach((req) => req.flush([]));

    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.fh-goal-card');
    expect(cards.length).toBe(1);
  });
});
