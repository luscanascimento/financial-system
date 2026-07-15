import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import type {
  Account,
  Category,
  Paginated,
  Transaction,
} from '@financehub/shared-types';
import { of } from 'rxjs';

import { Transactions } from './transactions';
import { TransactionsService } from './transactions.service';

const emptyPage: Paginated<Transaction> = {
  items: [],
  meta: {
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  },
};

const serviceStub: Partial<TransactionsService> = {
  list: () => of(emptyPage),
  listAccounts: () => of([] as Account[]),
  listCategories: () => of([] as Category[]),
};

describe('Transactions', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Transactions],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TransactionsService, useValue: serviceStub },
      ],
    }).compileComponents();
  });

  it('renders the page header', () => {
    const fixture = TestBed.createComponent(Transactions);
    fixture.detectChanges();

    const header = fixture.nativeElement.querySelector('.fh-page-header h1');
    expect(header?.textContent).toContain('Transactions');
  });

  it('shows the empty state when there are no transactions', () => {
    const fixture = TestBed.createComponent(Transactions);
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('.fh-empty-state');
    expect(empty).toBeTruthy();
  });
});
