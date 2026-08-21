import 'package:dio/dio.dart';
import 'package:financehub_mobile/src/core/network/api_exception.dart';
import 'package:flutter_test/flutter_test.dart';

/// The single place the mobile client turns a transport failure into text a
/// user reads. It has to survive every shape the API (and the network) can
/// hand it, including bodies that are not the canonical error envelope.
void main() {
  final request = RequestOptions(path: '/accounts');

  DioException withBody(Object? data, {int statusCode = 400}) => DioException(
        requestOptions: request,
        type: DioExceptionType.badResponse,
        response: Response<Object?>(
          requestOptions: request,
          statusCode: statusCode,
          data: data,
        ),
      );

  group('ApiException.fromDio', () {
    test('uses the API message when the body is the canonical envelope', () {
      final error = withBody({
        'statusCode': 409,
        'error': 'Conflict',
        'message': 'An account with that name already exists',
      }, statusCode: 409);

      final exception = ApiException.fromDio(error);

      expect(exception.statusCode, 409);
      expect(exception.message, 'An account with that name already exists');
      expect(exception.isConflict, isTrue);
      expect(exception.toString(), exception.message);
    });

    test('joins class-validator message arrays into one readable block', () {
      // NestJS ValidationPipe returns `message` as a string[].
      final exception = ApiException.fromDio(withBody({
        'statusCode': 400,
        'message': ['amountMinor must be an integer', 'date must be a date'],
      }));

      expect(
        exception.message,
        'amountMinor must be an integer\ndate must be a date',
      );
    });

    test('classifies auth and not-found responses', () {
      expect(
        ApiException.fromDio(
                withBody({'message': 'Unauthorized'}, statusCode: 401))
            .isUnauthorized,
        isTrue,
      );
      expect(
        ApiException.fromDio(
                withBody({'message': 'Not found'}, statusCode: 404))
            .isNotFound,
        isTrue,
      );
      expect(
        ApiException.fromDio(withBody({'message': 'Nope'}, statusCode: 403))
            .isUnauthorized,
        isFalse,
      );
    });

    test('falls back to friendly text when the body is not an error envelope',
        () {
      // An HTML error page or a bare string must not leak into the UI verbatim.
      final html = ApiException.fromDio(
        withBody('<html>502 Bad Gateway</html>', statusCode: 502),
      );
      expect(html.statusCode, 502);
      expect(html.message, isNot(contains('<html>')));
      expect(html.message, contains('server'));

      // A JSON body without `message` hits the same fallback.
      final noMessage =
          ApiException.fromDio(withBody({'error': 'Bad Request'}));
      expect(noMessage.message, 'Request failed. Please try again.');
    });

    test('maps timeouts and unreachable hosts to actionable text', () {
      for (final type in [
        DioExceptionType.connectionTimeout,
        DioExceptionType.sendTimeout,
        DioExceptionType.receiveTimeout,
      ]) {
        final exception = ApiException.fromDio(
          DioException(requestOptions: request, type: type),
        );
        expect(exception.statusCode, 0, reason: 'no response was received');
        expect(exception.message, contains('timed out'));
      }

      final offline = ApiException.fromDio(
        DioException(
          requestOptions: request,
          type: DioExceptionType.connectionError,
        ),
      );
      expect(offline.statusCode, 0);
      expect(offline.message, contains('Could not reach the server'));
    });
  });
}
