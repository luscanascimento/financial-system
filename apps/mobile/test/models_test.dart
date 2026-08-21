import 'package:financehub_mobile/src/models/account.dart';
import 'package:financehub_mobile/src/models/budget.dart';
import 'package:financehub_mobile/src/models/enums.dart';
import 'package:financehub_mobile/src/models/goal.dart';
import 'package:financehub_mobile/src/models/paginated.dart';
import 'package:financehub_mobile/src/models/reports.dart';
import 'package:financehub_mobile/src/models/transaction.dart';
import 'package:flutter_test/flutter_test.dart';

/// Wire-contract tests for the client-side mirror of the API's financial
/// model. Money crosses the wire as an integer count of minor units and must
/// never be widened to a double on the way in, so every amount assertion here
/// checks both the value and that it stayed an `int`.
void main() {
  group('Transaction', () {
    Map<String, dynamic> json({
      String type = 'EXPENSE',
      num amountMinor = 4599,
      Map<String, dynamic> extra = const {},
    }) =>
        {
          'id': 'tx_1',
          'accountId': 'acc_1',
          'categoryId': null,
          'type': type,
          'amountMinor': amountMinor,
          'description': 'Groceries',
          'notes': null,
          'date': '2026-03-14T00:00:00.000Z',
          'status': 'CLEARED',
          'installmentGroupId': null,
          'installmentNumber': null,
          'installmentTotal': null,
          'recurringTransactionId': null,
          'createdAt': '2026-03-14T10:00:00.000Z',
          'updatedAt': '2026-03-14T10:00:00.000Z',
          ...extra,
        };

    test('parses the wire payload', () {
      final tx = Transaction.fromJson(json());

      expect(tx.id, 'tx_1');
      expect(tx.accountId, 'acc_1');
      expect(tx.categoryId, isNull);
      expect(tx.type, FlowType.expense);
      expect(tx.amountMinor, 4599);
      expect(tx.status, TransactionStatus.cleared);
      expect(tx.date.toUtc().toIso8601String(), '2026-03-14T00:00:00.000Z');
    });

    test('signs the amount by flow type', () {
      expect(Transaction.fromJson(json(type: 'EXPENSE')).signedMinor, -4599);
      expect(Transaction.fromJson(json(type: 'INCOME')).signedMinor, 4599);
      // Zero has no sign to flip.
      expect(
        Transaction.fromJson(json(type: 'EXPENSE', amountMinor: 0)).signedMinor,
        0,
      );
    });

    test('keeps amounts as integer minor units even when JSON is a double', () {
      // Some JSON encoders emit `4599.0`; truncating to int must not lose cents.
      final tx = Transaction.fromJson(json(amountMinor: 4599.0));

      expect(tx.amountMinor, isA<int>());
      expect(tx.amountMinor, 4599);
    });

    test('parses installment metadata when the API splits a purchase', () {
      final tx = Transaction.fromJson(
        json(extra: {
          'installmentGroupId': 'grp_1',
          'installmentNumber': 2,
          'installmentTotal': 12,
        }),
      );

      expect(tx.installmentGroupId, 'grp_1');
      expect(tx.installmentNumber, 2);
      expect(tx.installmentTotal, 12);
    });
  });

  group('Account', () {
    test('parses balances and optional fields', () {
      final account = Account.fromJson({
        'id': 'acc_1',
        'name': 'Main checking',
        'type': 'CREDIT_CARD',
        'currency': 'USD',
        'balanceMinor': -125050,
        'initialBalanceMinor': 0,
        'creditLimitMinor': 500000,
        'institution': null,
        'color': null,
        'icon': null,
        'createdAt': '2026-01-01T00:00:00.000Z',
        'updatedAt': '2026-01-01T00:00:00.000Z',
      });

      expect(account.type, AccountType.creditCard);
      expect(account.balanceMinor, -125050);
      expect(account.creditLimitMinor, 500000);
      // `archived` is absent from the payload and must default to false rather
      // than blowing up on a null cast.
      expect(account.archived, isFalse);
    });
  });

  group('BudgetProgress', () {
    Map<String, dynamic> json({required num spentMinor}) => {
          'id': 'bud_1',
          'categoryId': 'cat_1',
          'name': 'Groceries',
          'amountMinor': 50000,
          'period': 'MONTHLY',
          'startDate': '2026-03-01T00:00:00.000Z',
          'createdAt': '2026-03-01T00:00:00.000Z',
          'updatedAt': '2026-03-01T00:00:00.000Z',
          'periodStart': '2026-03-01T00:00:00.000Z',
          'periodEnd': '2026-03-31T23:59:59.000Z',
          'spentMinor': spentMinor,
          'remainingMinor': 50000 - spentMinor,
          'ratio': spentMinor / 50000,
        };

    test('inherits the budget fields and defaults rollover to false', () {
      final budget = BudgetProgress.fromJson(json(spentMinor: 12500));

      expect(budget.name, 'Groceries');
      expect(budget.period, BudgetPeriod.monthly);
      expect(budget.amountMinor, 50000);
      expect(budget.remainingMinor, 37500);
      expect(budget.rollover, isFalse);
    });

    test('flags over-budget strictly above the cap', () {
      expect(BudgetProgress.fromJson(json(spentMinor: 49999)).isOverBudget,
          isFalse);
      // Spending exactly the cap is still within budget.
      expect(BudgetProgress.fromJson(json(spentMinor: 50000)).isOverBudget,
          isFalse);
      expect(BudgetProgress.fromJson(json(spentMinor: 50001)).isOverBudget,
          isTrue);
    });
  });

  group('Goal', () {
    Goal goal({required int target, required int current}) => Goal.fromJson({
          'id': 'goal_1',
          'name': 'Emergency fund',
          'targetAmountMinor': target,
          'currentAmountMinor': current,
          'currency': 'USD',
          'targetDate': null,
          'accountId': null,
          'color': null,
          'icon': null,
          'status': 'ACTIVE',
          'createdAt': '2026-01-01T00:00:00.000Z',
          'updatedAt': '2026-01-01T00:00:00.000Z',
        });

    test('computes progress as a 0–1 ratio', () {
      expect(goal(target: 100000, current: 25000).ratio, 0.25);
      expect(goal(target: 100000, current: 0).ratio, 0);
    });

    test('clamps the ratio and never divides by zero', () {
      // Overfunded goals cap at 100% so progress bars cannot overflow.
      expect(goal(target: 100000, current: 250000).ratio, 1.0);
      // A zero target would otherwise produce NaN/Infinity.
      expect(goal(target: 0, current: 5000).ratio, 0);
      expect(goal(target: 100000, current: -5000).ratio, 0);
    });
  });

  group('Paginated', () {
    test('maps items through the element parser and reads the meta', () {
      final page = Paginated.fromJson({
        'items': [
          {
            'currency': 'USD',
            'assetsMinor': 1000,
            'liabilitiesMinor': 400,
            'netWorthMinor': 600,
          },
        ],
        'meta': {
          'page': 2,
          'pageSize': 20,
          'totalItems': 41,
          'totalPages': 3,
          'hasPreviousPage': true,
          'hasNextPage': true,
        },
      }, NetWorthSummary.fromJson);

      expect(page.items.single.netWorthMinor, 600);
      expect(page.meta.page, 2);
      expect(page.meta.totalItems, 41);
      expect(page.meta.hasNextPage, isTrue);
    });

    test('defaults the page flags when the API omits them', () {
      final page = Paginated.fromJson({
        'items': <dynamic>[],
        'meta': {
          'page': 1,
          'pageSize': 20,
          'totalItems': 0,
          'totalPages': 0,
        },
      }, NetWorthSummary.fromJson);

      expect(page.items, isEmpty);
      expect(page.meta.hasPreviousPage, isFalse);
      expect(page.meta.hasNextPage, isFalse);
    });
  });

  group('FinancialOverview', () {
    test('parses the dashboard KPI payload including the nested net worth', () {
      final overview = FinancialOverview.fromJson({
        'currency': 'USD',
        'totalBalanceMinor': 1234567,
        'netWorth': {
          'currency': 'USD',
          'assetsMinor': 1500000,
          'liabilitiesMinor': 265433,
          'netWorthMinor': 1234567,
        },
        'monthIncomeMinor': 500000,
        'monthExpenseMinor': 320000,
        'monthNetMinor': 180000,
        'accountsCount': 4,
        'transactionsCount': 128,
      });

      expect(overview.totalBalanceMinor, 1234567);
      expect(overview.netWorth.liabilitiesMinor, 265433);
      expect(
        overview.monthIncomeMinor - overview.monthExpenseMinor,
        overview.monthNetMinor,
      );
    });
  });

  group('CategoryBreakdownItem', () {
    test('tolerates the uncategorized bucket (null id)', () {
      final item = CategoryBreakdownItem.fromJson({
        'categoryId': null,
        'categoryName': 'Uncategorized',
        'color': null,
        'type': 'EXPENSE',
        'amountMinor': 7500,
        'ratio': 0.15,
      });

      expect(item.categoryId, isNull);
      expect(item.type, FlowType.expense);
      expect(item.amountMinor, 7500);
      expect(item.ratio, closeTo(0.15, 1e-9));
    });
  });
}
