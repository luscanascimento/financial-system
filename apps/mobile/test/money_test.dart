import 'package:financehub_mobile/src/core/format/money.dart';
import 'package:financehub_mobile/src/models/enums.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Money', () {
    test('converts between minor and major units', () {
      expect(Money.minorToMajor(4599), 45.99);
      expect(Money.majorToMinor(45.99), 4599);
      // Guards against float drift.
      expect(Money.majorToMinor(0.1 + 0.2), 30);
    });

    test('formats minor units as currency', () {
      expect(Money.format(4599, 'USD', locale: 'en_US'), r'$45.99');
    });

    test('formatSigned prefixes the sign', () {
      expect(Money.formatSigned(-500, 'USD', locale: 'en_US'), startsWith('−'));
      expect(Money.formatSigned(500, 'USD', locale: 'en_US'), startsWith('+'));
    });
  });

  group('enums', () {
    test('round-trip wire values', () {
      expect(FlowType.expense.wire, 'EXPENSE');
      expect(FlowType.fromWire('INCOME'), FlowType.income);
      expect(AccountType.fromWire('CREDIT_CARD'), AccountType.creditCard);
      expect(BudgetPeriod.fromWire('MONTHLY'), BudgetPeriod.monthly);
    });
  });
}
