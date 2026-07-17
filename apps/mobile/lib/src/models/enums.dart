/// Domain enums mirroring the Prisma schema / shared-types contract. Each
/// carries its wire value (the exact string the API sends/accepts).
library;

enum FlowType {
  income('INCOME'),
  expense('EXPENSE');

  const FlowType(this.wire);
  final String wire;

  static FlowType fromWire(String value) =>
      FlowType.values.firstWhere((e) => e.wire == value);
}

enum AccountType {
  checking('CHECKING'),
  savings('SAVINGS'),
  creditCard('CREDIT_CARD'),
  cash('CASH'),
  wallet('WALLET'),
  investment('INVESTMENT');

  const AccountType(this.wire);
  final String wire;

  static AccountType fromWire(String value) =>
      AccountType.values.firstWhere((e) => e.wire == value);
}

enum TransactionStatus {
  pending('PENDING'),
  cleared('CLEARED');

  const TransactionStatus(this.wire);
  final String wire;

  static TransactionStatus fromWire(String value) =>
      TransactionStatus.values.firstWhere((e) => e.wire == value);
}

enum BudgetPeriod {
  weekly('WEEKLY'),
  monthly('MONTHLY'),
  yearly('YEARLY');

  const BudgetPeriod(this.wire);
  final String wire;

  static BudgetPeriod fromWire(String value) =>
      BudgetPeriod.values.firstWhere((e) => e.wire == value);
}

enum RecurrenceFrequency {
  daily('DAILY'),
  weekly('WEEKLY'),
  monthly('MONTHLY'),
  yearly('YEARLY');

  const RecurrenceFrequency(this.wire);
  final String wire;

  static RecurrenceFrequency fromWire(String value) =>
      RecurrenceFrequency.values.firstWhere((e) => e.wire == value);
}

enum GoalStatus {
  active('ACTIVE'),
  achieved('ACHIEVED'),
  archived('ARCHIVED');

  const GoalStatus(this.wire);
  final String wire;

  static GoalStatus fromWire(String value) =>
      GoalStatus.values.firstWhere((e) => e.wire == value);
}

enum Role {
  user('USER'),
  admin('ADMIN');

  const Role(this.wire);
  final String wire;

  static Role fromWire(String value) =>
      Role.values.firstWhere((e) => e.wire == value, orElse: () => Role.user);
}

/// Human-friendly labels for display.
extension AccountTypeLabel on AccountType {
  String get label => switch (this) {
        AccountType.checking => 'Checking',
        AccountType.savings => 'Savings',
        AccountType.creditCard => 'Credit card',
        AccountType.cash => 'Cash',
        AccountType.wallet => 'Wallet',
        AccountType.investment => 'Investment',
      };
}

extension BudgetPeriodLabel on BudgetPeriod {
  String get label => switch (this) {
        BudgetPeriod.weekly => 'Weekly',
        BudgetPeriod.monthly => 'Monthly',
        BudgetPeriod.yearly => 'Yearly',
      };
}

extension RecurrenceFrequencyLabel on RecurrenceFrequency {
  String get label => switch (this) {
        RecurrenceFrequency.daily => 'Daily',
        RecurrenceFrequency.weekly => 'Weekly',
        RecurrenceFrequency.monthly => 'Monthly',
        RecurrenceFrequency.yearly => 'Yearly',
      };
}
