import 'package:dio/dio.dart';

/// A normalized error surfaced to the UI. Parses the API's canonical error body
/// (`{ statusCode, error, message, ... }`) into a single readable message.
class ApiException implements Exception {
  const ApiException({required this.statusCode, required this.message});

  final int statusCode;
  final String message;

  bool get isUnauthorized => statusCode == 401;
  bool get isNotFound => statusCode == 404;
  bool get isConflict => statusCode == 409;

  @override
  String toString() => message;

  /// Builds an [ApiException] from a Dio failure, extracting the server-provided
  /// message when present and falling back to friendly network-error text.
  factory ApiException.fromDio(DioException error) {
    final response = error.response;
    final status = response?.statusCode ?? 0;

    final data = response?.data;
    if (data is Map && data['message'] != null) {
      final message = data['message'];
      final text = message is List
          ? message.map((m) => m.toString()).join('\n')
          : message.toString();
      return ApiException(statusCode: status, message: text);
    }

    final message = switch (error.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout =>
        'The request timed out. Check your connection and try again.',
      DioExceptionType.connectionError =>
        'Could not reach the server. Is the API running?',
      _ => status >= 500
          ? 'Something went wrong on the server. Please try again.'
          : 'Request failed. Please try again.',
    };
    return ApiException(statusCode: status, message: message);
  }
}
