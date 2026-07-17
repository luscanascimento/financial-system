import 'package:flutter/material.dart';

import '../format/money.dart';
import '../theme/app_theme.dart';

/// Displays a monetary amount (minor units), optionally coloured by sign.
class MoneyText extends StatelessWidget {
  const MoneyText(
    this.amountMinor,
    this.currency, {
    super.key,
    this.signed = false,
    this.colored = false,
    this.style,
  });

  final int amountMinor;
  final String currency;
  final bool signed;
  final bool colored;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final text = signed
        ? Money.formatSigned(amountMinor, currency)
        : Money.format(amountMinor, currency);

    Color? color;
    if (colored && amountMinor != 0) {
      color = amountMinor > 0
          ? AppTheme.positive(context)
          : AppTheme.negative(context);
    }

    return Text(
      text,
      style: (style ?? Theme.of(context).textTheme.titleMedium)
          ?.copyWith(color: color, fontFeatures: const []),
    );
  }
}
