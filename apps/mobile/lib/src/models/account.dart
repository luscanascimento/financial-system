import 'enums.dart';

/// A place money lives: bank account, credit card, cash, wallet or investment.
class Account {
  const Account({
    required this.id,
    required this.name,
    required this.type,
    required this.currency,
    required this.balanceMinor,
    required this.initialBalanceMinor,
    required this.creditLimitMinor,
    required this.institution,
    required this.color,
    required this.icon,
    required this.archived,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String name;
  final AccountType type;
  final String currency;
  final int balanceMinor;
  final int initialBalanceMinor;
  final int? creditLimitMinor;
  final String? institution;
  final String? color;
  final String? icon;
  final bool archived;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory Account.fromJson(Map<String, dynamic> json) => Account(
        id: json['id'] as String,
        name: json['name'] as String,
        type: AccountType.fromWire(json['type'] as String),
        currency: json['currency'] as String,
        balanceMinor: (json['balanceMinor'] as num).toInt(),
        initialBalanceMinor: (json['initialBalanceMinor'] as num).toInt(),
        creditLimitMinor: (json['creditLimitMinor'] as num?)?.toInt(),
        institution: json['institution'] as String?,
        color: json['color'] as String?,
        icon: json['icon'] as String?,
        archived: json['archived'] as bool? ?? false,
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
      );
}
