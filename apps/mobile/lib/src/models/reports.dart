import 'enums.dart';

/// Aggregate net-worth snapshot across all accounts, for one currency.
class NetWorthSummary {
  const NetWorthSummary({
    required this.currency,
    required this.assetsMinor,
    required this.liabilitiesMinor,
    required this.netWorthMinor,
  });

  final String currency;
  final int assetsMinor;
  final int liabilitiesMinor;
  final int netWorthMinor;

  factory NetWorthSummary.fromJson(Map<String, dynamic> json) =>
      NetWorthSummary(
        currency: json['currency'] as String,
        assetsMinor: (json['assetsMinor'] as num).toInt(),
        liabilitiesMinor: (json['liabilitiesMinor'] as num).toInt(),
        netWorthMinor: (json['netWorthMinor'] as num).toInt(),
      );
}

/// Income vs. expense totals for a single calendar bucket.
class CashFlowPoint {
  const CashFlowPoint({
    required this.period,
    required this.incomeMinor,
    required this.expenseMinor,
    required this.netMinor,
  });

  final DateTime period;
  final int incomeMinor;
  final int expenseMinor;
  final int netMinor;

  factory CashFlowPoint.fromJson(Map<String, dynamic> json) => CashFlowPoint(
        period: DateTime.parse(json['period'] as String).toLocal(),
        incomeMinor: (json['incomeMinor'] as num).toInt(),
        expenseMinor: (json['expenseMinor'] as num).toInt(),
        netMinor: (json['netMinor'] as num).toInt(),
      );
}

/// Spend (or income) grouped by category for a period.
class CategoryBreakdownItem {
  const CategoryBreakdownItem({
    required this.categoryId,
    required this.categoryName,
    required this.color,
    required this.type,
    required this.amountMinor,
    required this.ratio,
  });

  final String? categoryId;
  final String categoryName;
  final String? color;
  final FlowType type;
  final int amountMinor;

  /// Share of the total for this flow type, 0–1.
  final double ratio;

  factory CategoryBreakdownItem.fromJson(Map<String, dynamic> json) =>
      CategoryBreakdownItem(
        categoryId: json['categoryId'] as String?,
        categoryName: json['categoryName'] as String,
        color: json['color'] as String?,
        type: FlowType.fromWire(json['type'] as String),
        amountMinor: (json['amountMinor'] as num).toInt(),
        ratio: (json['ratio'] as num).toDouble(),
      );
}

/// Headline KPIs for the dashboard overview.
class FinancialOverview {
  const FinancialOverview({
    required this.currency,
    required this.totalBalanceMinor,
    required this.netWorth,
    required this.monthIncomeMinor,
    required this.monthExpenseMinor,
    required this.monthNetMinor,
    required this.accountsCount,
    required this.transactionsCount,
  });

  final String currency;
  final int totalBalanceMinor;
  final NetWorthSummary netWorth;
  final int monthIncomeMinor;
  final int monthExpenseMinor;
  final int monthNetMinor;
  final int accountsCount;
  final int transactionsCount;

  factory FinancialOverview.fromJson(Map<String, dynamic> json) =>
      FinancialOverview(
        currency: json['currency'] as String,
        totalBalanceMinor: (json['totalBalanceMinor'] as num).toInt(),
        netWorth:
            NetWorthSummary.fromJson(json['netWorth'] as Map<String, dynamic>),
        monthIncomeMinor: (json['monthIncomeMinor'] as num).toInt(),
        monthExpenseMinor: (json['monthExpenseMinor'] as num).toInt(),
        monthNetMinor: (json['monthNetMinor'] as num).toInt(),
        accountsCount: (json['accountsCount'] as num).toInt(),
        transactionsCount: (json['transactionsCount'] as num).toInt(),
      );
}
