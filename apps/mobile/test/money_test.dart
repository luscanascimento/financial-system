import 'package:financehub_mobile/src/core/format/dates.dart';
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

    test('round-trips every cent value without drift', () {
      // The classic float traps: 0.07 * 100 == 7.000000000000001 and
      // 8.29 * 100 == 828.9999999999999 in IEEE-754.
      for (final major in [0.07, 8.29, 1.15, 2.67, 1234.56]) {
        final minor = Money.majorToMinor(major);
        expect(minor, isA<int>());
        expect(Money.minorToMajor(minor), closeTo(major, 1e-9));
      }
      expect(Money.majorToMinor(0.07), 7);
      expect(Money.majorToMinor(8.29), 829);
    });

    test('handles negative and zero amounts', () {
      expect(Money.minorToMajor(-4599), -45.99);
      expect(Money.majorToMinor(-45.99), -4599);
      expect(Money.majorToMinor(0), 0);
      expect(Money.minorToMajor(0), 0);
    });

    test('formats large amounts with grouping separators', () {
      expect(Money.format(199999999, 'USD', locale: 'en_US'), r'$1,999,999.99');
    });

    test('formats a negative balance (an overdrawn or credit-card account)',
        () {
      // Credit-card accounts carry a negative balance; the minus must survive.
      expect(Money.format(-4599, 'USD', locale: 'en_US'), contains('45.99'));
      expect(Money.format(-4599, 'USD', locale: 'en_US'), isNot(r'$45.99'));
    });

    test('formatSigned prefixes the sign', () {
      expect(Money.formatSigned(-500, 'USD', locale: 'en_US'), startsWith('−'));
      expect(Money.formatSigned(500, 'USD', locale: 'en_US'), startsWith('+'));
    });

    test('formatSigned leaves zero unsigned and drops the inner minus', () {
      expect(Money.formatSigned(0, 'USD', locale: 'en_US'), r'$0.00');
      // The sign is rendered by formatSigned itself, so the absolute value must
      // be formatted — never "−-$5.00".
      expect(Money.formatSigned(-500, 'USD', locale: 'en_US'), '−\$5.00');
      expect(Money.formatSigned(500, 'USD', locale: 'en_US'), '+\$5.00');
    });

    test('respects the currency code', () {
      expect(Money.format(4599, 'EUR', locale: 'en_US'), contains('45.99'));
      expect(Money.format(4599, 'BRL', locale: 'pt_BR'), contains('45,99'));
    });
  });

  group('enums', () {
    test('round-trip wire values', () {
      expect(FlowType.expense.wire, 'EXPENSE');
      expect(FlowType.fromWire('INCOME'), FlowType.income);
      expect(AccountType.fromWire('CREDIT_CARD'), AccountType.creditCard);
      expect(BudgetPeriod.fromWire('MONTHLY'), BudgetPeriod.monthly);
    });

    test('every enum value survives a wire round-trip', () {
      for (final value in AccountType.values) {
        expect(AccountType.fromWire(value.wire), value);
      }
      for (final value in RecurrenceFrequency.values) {
        expect(RecurrenceFrequency.fromWire(value.wire), value);
      }
      for (final value in GoalStatus.values) {
        expect(GoalStatus.fromWire(value.wire), value);
      }
      for (final value in TransactionStatus.values) {
        expect(TransactionStatus.fromWire(value.wire), value);
      }
    });

    test('unknown wire values throw, except Role which falls back to user', () {
      // Fail loudly on an unmodelled domain value rather than silently
      // mis-classifying money…
      expect(() => FlowType.fromWire('TRANSFER'), throwsStateError);
      expect(() => AccountType.fromWire('CRYPTO'), throwsStateError);
      // …but an unknown role must degrade to the least-privileged one.
      expect(Role.fromWire('SUPERADMIN'), Role.user);
      expect(Role.fromWire('ADMIN'), Role.admin);
    });
  });

  group('Dates', () {
    test('parses ISO strings to local time and serializes back to UTC', () {
      const iso = '2026-03-14T12:30:00.000Z';
      final parsed = Dates.parse(iso);

      expect(parsed.isUtc, isFalse);
      expect(Dates.toIso(parsed), iso);
    });

    test('tryParse tolerates null and malformed input', () {
      expect(Dates.tryParse(null), isNull);
      expect(Dates.tryParse('not-a-date'), isNull);
      expect(Dates.tryParse('2026-03-14T00:00:00.000Z'), isNotNull);
    });
  });
}
