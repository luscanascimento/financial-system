import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { Budgets } from './budgets';

describe('Budgets', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Budgets],
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

  it('renders and requests budgets and expense categories on load', () => {
    const fixture = TestBed.createComponent(Budgets);
    fixture.detectChanges();

    const budgetsReq = httpMock.expectOne((r) => r.url.endsWith('/budgets'));
    expect(budgetsReq.request.method).toBe('GET');
    budgetsReq.flush([]);

    const categoriesReq = httpMock.expectOne((r) =>
      r.url.endsWith('/categories'),
    );
    expect(categoriesReq.request.method).toBe('GET');
    expect(categoriesReq.request.params.get('type')).toBe('EXPENSE');
    categoriesReq.flush([]);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain(
      'Budgets',
    );
    expect(fixture.nativeElement.querySelector('.fh-empty-state')).toBeTruthy();
  });
});
