import 'package:intl/intl.dart';

import '../config/env.dart';

/// Date formatting/parsing helpers. The API exchanges ISO-8601 strings.
class Dates {
  const Dates._();

  /// Parses an ISO-8601 string to a local [DateTime].
  static DateTime parse(String iso) => DateTime.parse(iso).toLocal();

  /// Parses a nullable ISO string.
  static DateTime? tryParse(String? iso) =>
      iso == null ? null : DateTime.tryParse(iso)?.toLocal();

  /// Serializes a [DateTime] to a UTC ISO-8601 string for the API.
  static String toIso(DateTime date) => date.toUtc().toIso8601String();

  /// `Jul 15, 2026`.
  static String medium(DateTime date) =>
      DateFormat.yMMMd(Env.locale).format(date);

  /// `Jul 15`.
  static String monthDay(DateTime date) =>
      DateFormat.MMMd(Env.locale).format(date);

  /// `July 2026`.
  static String monthYear(DateTime date) =>
      DateFormat.yMMMM(Env.locale).format(date);
}
