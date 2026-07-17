import 'enums.dart';

/// A single income or expense entry against an account.
class Transaction {
  const Transaction({
    required this.id,
    required this.accountId,
    required this.categoryId,
    required this.type,
    required this.amountMinor,
    required this.description,
    required this.notes,
    required this.date,
    required this.status,
    required this.installmentGroupId,
    required this.installmentNumber,
    required this.installmentTotal,
    required this.recurringTransactionId,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String accountId;
  final String? categoryId;
  final FlowType type;
  final int amountMinor;
  final String description;
  final String? notes;
  final DateTime date;
  final TransactionStatus status;
  final String? installmentGroupId;
  final int? installmentNumber;
  final int? installmentTotal;
  final String? recurringTransactionId;
  final DateTime createdAt;
  final DateTime updatedAt;

  /// Signed amount (+income / −expense) for ledger display and math.
  int get signedMinor => type == FlowType.expense ? -amountMinor : amountMinor;

  factory Transaction.fromJson(Map<String, dynamic> json) => Transaction(
        id: json['id'] as String,
        accountId: json['accountId'] as String,
        categoryId: json['categoryId'] as String?,
        type: FlowType.fromWire(json['type'] as String),
        amountMinor: (json['amountMinor'] as num).toInt(),
        description: json['description'] as String,
        notes: json['notes'] as String?,
        date: DateTime.parse(json['date'] as String).toLocal(),
        status: TransactionStatus.fromWire(json['status'] as String),
        installmentGroupId: json['installmentGroupId'] as String?,
        installmentNumber: (json['installmentNumber'] as num?)?.toInt(),
        installmentTotal: (json['installmentTotal'] as num?)?.toInt(),
        recurringTransactionId: json['recurringTransactionId'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
      );
}
