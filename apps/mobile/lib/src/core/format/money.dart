import 'dart:math' as math;

import 'package:intl/intl.dart';

import '../config/env.dart';

/// Monetary helpers mirroring the backend/web contract: money is stored as an
/// integer number of **minor units** to avoid float rounding.
///
/// The exponent is not always 2 — JPY has 0 and KWD has 3 — so it is read from
/// ICU through `intl` instead of being hardcoded to cents.
class Money {
  const Money._();

  /// ISO 4217 minor-unit factor (JPY → 1, USD → 100, KWD → 1000).
  static int _factor(String currency) {
    final digits = NumberFormat.simpleCurrency(locale: 'en_US', name: currency)
            .decimalDigits ??
        2;
    return math.pow(10, digits).toInt();
  }

  /// Minor units → major-unit double (e.g. `4599` + `USD` → `45.99`).
  static double minorToMajor(int amountMinor, [String currency = 'USD']) =>
      amountMinor / _factor(currency);

  /// Major-unit amount → integer minor units.
  static int majorToMinor(num amountMajor, [String currency = 'USD']) =>
      (amountMajor * _factor(currency)).round();

  /// Formats minor units as a localized currency string
  /// (e.g. `4599` + `USD` → `$45.99`).
  static String format(
    int amountMinor,
    String currency, {
    String? locale,
  }) {
    final format = NumberFormat.simpleCurrency(
      locale: locale ?? Env.locale,
      name: currency,
    );
    return format.format(minorToMajor(amountMinor, currency));
  }

  /// A signed variant that always shows a leading `+`/`−` — handy for ledgers.
  static String formatSigned(
    int amountMinor,
    String currency, {
    String? locale,
  }) {
    final sign = amountMinor > 0 ? '+' : (amountMinor < 0 ? '−' : '');
    return '$sign${format(amountMinor.abs(), currency, locale: locale)}';
  }
}
