import 'enums.dart';

/// A savings target the user funds over time via contributions.
class Goal {
  const Goal({
    required this.id,
    required this.name,
    required this.targetAmountMinor,
    required this.currentAmountMinor,
    required this.currency,
    required this.targetDate,
    required this.accountId,
    required this.color,
    required this.icon,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String name;
  final int targetAmountMinor;
  final int currentAmountMinor;
  final String currency;
  final DateTime? targetDate;
  final String? accountId;
  final String? color;
  final String? icon;
  final GoalStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;

  /// Progress toward the target, clamped to 0–1.
  double get ratio => targetAmountMinor <= 0
      ? 0
      : (currentAmountMinor / targetAmountMinor).clamp(0, 1).toDouble();

  factory Goal.fromJson(Map<String, dynamic> json) => Goal(
        id: json['id'] as String,
        name: json['name'] as String,
        targetAmountMinor: (json['targetAmountMinor'] as num).toInt(),
        currentAmountMinor: (json['currentAmountMinor'] as num).toInt(),
        currency: json['currency'] as String,
        targetDate: json['targetDate'] == null
            ? null
            : DateTime.parse(json['targetDate'] as String).toLocal(),
        accountId: json['accountId'] as String?,
        color: json['color'] as String?,
        icon: json['icon'] as String?,
        status: GoalStatus.fromWire(json['status'] as String),
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
      );
}

/// A single deposit toward a goal.
class GoalContribution {
  const GoalContribution({
    required this.id,
    required this.goalId,
    required this.amountMinor,
    required this.date,
    required this.note,
    required this.createdAt,
  });

  final String id;
  final String goalId;
  final int amountMinor;
  final DateTime date;
  final String? note;
  final DateTime createdAt;

  factory GoalContribution.fromJson(Map<String, dynamic> json) =>
      GoalContribution(
        id: json['id'] as String,
        goalId: json['goalId'] as String,
        amountMinor: (json['amountMinor'] as num).toInt(),
        date: DateTime.parse(json['date'] as String).toLocal(),
        note: json['note'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}
