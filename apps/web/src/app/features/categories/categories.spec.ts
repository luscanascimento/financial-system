import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import type { Category } from '@financehub/shared-types';

import { environment } from '../../../environments/environment';
import { Categories } from './categories';

function makeCategory(over: Partial<Category>): Category {
  return {
    id: 'c1',
    name: 'Salary',
    type: 'INCOME',
    parentId: null,
    color: '#2e7d32',
    icon: null,
    system: false,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

const categories: Category[] = [
  makeCategory({ id: 'c1', name: 'Salary', type: 'INCOME' }),
  makeCategory({
    id: 'c2',
    name: 'Groceries',
    type: 'EXPENSE',
    color: '#c62828',
  }),
];

describe('Categories', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Categories],
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

  function flushList(data: Category[] = categories): void {
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/categories`);
    expect(req.request.method).toBe('GET');
    req.flush(data);
  }

  it('renders the Income and Expense columns', () => {
    const fixture = TestBed.createComponent(Categories);
    fixture.detectChanges();
    flushList();
    fixture.detectChanges();

    const columns = fixture.nativeElement.querySelectorAll(
      '.fh-category-column',
    );
    expect(columns.length).toBe(2);
  });

  it('groups loaded categories by flow type', () => {
    const fixture = TestBed.createComponent(Categories);
    fixture.detectChanges();
    flushList();
    fixture.detectChanges();

    const chips = fixture.nativeElement.querySelectorAll('mat-chip');
    expect(chips.length).toBe(2);
  });
});
