import 'enums.dart';

/// A spending cap for a category (or overall) over a recurring period.
class Budget {
  const Budget({
    required this.id,
    required this.categoryId,
    required this.name,
    required this.amountMinor,
    required this.period,
    required this.startDate,
    required this.rollover,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String? categoryId;
  final String name;
  final int amountMinor;
  final BudgetPeriod period;
  final DateTime startDate;
  final bool rollover;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory Budget.fromJson(Map<String, dynamic> json) => Budget(
        id: json['id'] as String,
        categoryId: json['categoryId'] as String?,
        name: json['name'] as String,
        amountMinor: (json['amountMinor'] as num).toInt(),
        period: BudgetPeriod.fromWire(json['period'] as String),
        startDate: DateTime.parse(json['startDate'] as String).toLocal(),
        rollover: json['rollover'] as bool? ?? false,
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
      );
}

/// A budget enriched with the current period's actual spend.
class BudgetProgress extends Budget {
  const BudgetProgress({
    required super.id,
    required super.categoryId,
    required super.name,
    required super.amountMinor,
    required super.period,
    required super.startDate,
    required super.rollover,
    required super.createdAt,
    required super.updatedAt,
    required this.periodStart,
    required this.periodEnd,
    required this.spentMinor,
    required this.remainingMinor,
    required this.ratio,
  });

  final DateTime periodStart;
  final DateTime periodEnd;
  final int spentMinor;
  final int remainingMinor;

  /// 0–1 (may exceed 1 when over budget).
  final double ratio;

  bool get isOverBudget => spentMinor > amountMinor;

  factory BudgetProgress.fromJson(Map<String, dynamic> json) {
    final base = Budget.fromJson(json);
    return BudgetProgress(
      id: base.id,
      categoryId: base.categoryId,
      name: base.name,
      amountMinor: base.amountMinor,
      period: base.period,
      startDate: base.startDate,
      rollover: base.rollover,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      periodStart: DateTime.parse(json['periodStart'] as String).toLocal(),
      periodEnd: DateTime.parse(json['periodEnd'] as String).toLocal(),
      spentMinor: (json['spentMinor'] as num).toInt(),
      remainingMinor: (json['remainingMinor'] as num).toInt(),
      ratio: (json['ratio'] as num).toDouble(),
    );
  }
}
