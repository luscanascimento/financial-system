import 'enums.dart';

/// A template that spawns transactions on a schedule.
class RecurringTransaction {
  const RecurringTransaction({
    required this.id,
    required this.accountId,
    required this.categoryId,
    required this.type,
    required this.amountMinor,
    required this.description,
    required this.frequency,
    required this.interval,
    required this.startDate,
    required this.nextRunDate,
    required this.endDate,
    required this.active,
    required this.lastRunAt,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String accountId;
  final String? categoryId;
  final FlowType type;
  final int amountMinor;
  final String description;
  final RecurrenceFrequency frequency;
  final int interval;
  final DateTime startDate;
  final DateTime nextRunDate;
  final DateTime? endDate;
  final bool active;
  final DateTime? lastRunAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory RecurringTransaction.fromJson(Map<String, dynamic> json) =>
      RecurringTransaction(
        id: json['id'] as String,
        accountId: json['accountId'] as String,
        categoryId: json['categoryId'] as String?,
        type: FlowType.fromWire(json['type'] as String),
        amountMinor: (json['amountMinor'] as num).toInt(),
        description: json['description'] as String,
        frequency: RecurrenceFrequency.fromWire(json['frequency'] as String),
        interval: (json['interval'] as num?)?.toInt() ?? 1,
        startDate: DateTime.parse(json['startDate'] as String).toLocal(),
        nextRunDate: DateTime.parse(json['nextRunDate'] as String).toLocal(),
        endDate: json['endDate'] == null
            ? null
            : DateTime.parse(json['endDate'] as String).toLocal(),
        active: json['active'] as bool? ?? true,
        lastRunAt: json['lastRunAt'] == null
            ? null
            : DateTime.parse(json['lastRunAt'] as String).toLocal(),
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
      );
}
