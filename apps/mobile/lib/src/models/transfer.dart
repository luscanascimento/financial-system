/// A movement of money between two of the user's own accounts.
class Transfer {
  const Transfer({
    required this.id,
    required this.fromAccountId,
    required this.toAccountId,
    required this.fromAmountMinor,
    required this.toAmountMinor,
    required this.description,
    required this.date,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String fromAccountId;
  final String toAccountId;
  final int fromAmountMinor;
  final int toAmountMinor;
  final String? description;
  final DateTime date;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory Transfer.fromJson(Map<String, dynamic> json) => Transfer(
        id: json['id'] as String,
        fromAccountId: json['fromAccountId'] as String,
        toAccountId: json['toAccountId'] as String,
        fromAmountMinor: (json['fromAmountMinor'] as num).toInt(),
        toAmountMinor: (json['toAmountMinor'] as num).toInt(),
        description: json['description'] as String?,
        date: DateTime.parse(json['date'] as String).toLocal(),
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
      );
}
