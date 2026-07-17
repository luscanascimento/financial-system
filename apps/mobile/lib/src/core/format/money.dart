import 'package:intl/intl.dart';

import '../config/env.dart';

/// Monetary helpers mirroring the backend/web contract: money is stored as an
/// integer number of **minor units** (e.g. cents) to avoid float rounding.
class Money {
  const Money._();

  /// Minor units (cents) → major-unit double (dollars).
  static double minorToMajor(int amountMinor) => amountMinor / 100;

  /// Major-unit amount → integer minor units.
  static int majorToMinor(num amountMajor) => (amountMajor * 100).round();

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
    return format.format(minorToMajor(amountMinor));
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
