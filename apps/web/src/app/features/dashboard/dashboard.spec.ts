import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import type {
  CashFlowPoint,
  CategoryBreakdownItem,
  FinancialOverview,
} from '@financehub/shared-types';

import { Dashboard } from './dashboard';

const overview: FinancialOverview = {
  currency: 'USD',
  totalBalanceMinor: 1_250_00,
  netWorth: {
    currency: 'USD',
    assetsMinor: 1_250_00,
    liabilitiesMinor: 0,
    netWorthMinor: 1_250_00,
  },
  monthIncomeMinor: 500_00,
  monthExpenseMinor: 320_00,
  monthNetMinor: 180_00,
  accountsCount: 2,
  transactionsCount: 14,
};

const cashFlow: CashFlowPoint[] = [
  {
    period: '2026-06-01',
    incomeMinor: 500_00,
    expenseMinor: 320_00,
    netMinor: 180_00,
  },
  {
    period: '2026-07-01',
    incomeMinor: 600_00,
    expenseMinor: 400_00,
    netMinor: 200_00,
  },
];

const breakdown: CategoryBreakdownItem[] = [
  {
    categoryId: 'c1',
    categoryName: 'Groceries',
    color: '#4caf50',
    type: 'EXPENSE',
    amountMinor: 200_00,
    ratio: 0.6,
  },
];

describe('Dashboard', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
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

  function flushReports(): void {
    httpMock
      .expectOne((req) => req.url.endsWith('/reports/overview'))
      .flush(overview);
    httpMock
      .expectOne((req) => req.url.endsWith('/reports/cash-flow'))
      .flush(cashFlow);
    httpMock
      .expectOne((req) => req.url.endsWith('/reports/category-breakdown'))
      .flush(breakdown);
  }

  it('creates', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    flushReports();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the four KPI cards once loaded', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    flushReports();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.fh-kpi');
    expect(cards.length).toBe(4);
  });
});
