import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:path_provider/path_provider.dart';

import '../config/env.dart';
import '../storage/token_store.dart';
import 'api_exception.dart';

/// The single HTTP gateway to the FinanceHub API.
///
/// Mirrors the web client's session model: the access token is attached as a
/// bearer header, and the rotating refresh token lives in an httpOnly cookie
/// (persisted by [PersistCookieJar]). On a 401 the client performs ONE shared
/// refresh (single-flight, so concurrent 401s don't trip the backend's
/// refresh-token reuse detection) and retries the original request once.
class ApiClient {
  ApiClient._(this._dio, this._refreshDio, this.tokens);

  final Dio _dio;
  final Dio _refreshDio;
  final TokenStore tokens;

  /// Invoked when the session can no longer be recovered (refresh failed), so
  /// the app can route back to the login screen. Wired by the auth controller.
  void Function()? onSessionExpired;

  Future<bool>? _refreshing;

  /// Paths where a 401 is a genuine credential error, never a token-expiry that
  /// a refresh could fix — so we must not attempt the refresh-and-retry dance.
  static const _noRefreshPaths = <String>[
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/logout',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/resend-verification',
  ];

  static Future<ApiClient> create() async {
    // On web there is no filesystem (and the browser manages cookies itself),
    // so fall back to an in-memory jar; native platforms persist it to disk.
    final CookieJar jar;
    if (kIsWeb) {
      jar = CookieJar();
    } else {
      final supportDir = await getApplicationSupportDirectory();
      jar = PersistCookieJar(
        storage: FileStorage('${supportDir.path}/.fh_cookies'),
      );
    }
    final tokens = TokenStore();
    await tokens.load();

    BaseOptions options() => BaseOptions(
          baseUrl: Env.apiBaseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 20),
          contentType: Headers.jsonContentType,
          // Let us handle non-2xx uniformly via ApiException.
          validateStatus: (status) => status != null && status < 300,
        );

    final dio = Dio(options())..interceptors.add(CookieManager(jar));
    final refreshDio = Dio(options())..interceptors.add(CookieManager(jar));

    final client = ApiClient._(dio, refreshDio, tokens);
    dio.interceptors.add(client._authInterceptor());
    return client;
  }

  InterceptorsWrapper _authInterceptor() => InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = tokens.accessToken;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final request = error.requestOptions;
          final canRetry = error.response?.statusCode == 401 &&
              request.extra['retried'] != true &&
              !_noRefreshPaths.any((p) => request.path.contains(p));

          if (!canRetry) {
            handler.next(error);
            return;
          }

          final refreshed = await _refresh();
          if (!refreshed) {
            handler.next(error);
            return;
          }

          try {
            request.extra['retried'] = true;
            final token = tokens.accessToken;
            if (token != null) {
              request.headers['Authorization'] = 'Bearer $token';
            }
            final response = await _dio.fetch<dynamic>(request);
            handler.resolve(response);
          } on DioException catch (retryError) {
            handler.next(retryError);
          }
        },
      );

  /// Single-flight refresh. Returns true when a new access token was obtained.
  Future<bool> _refresh() {
    return _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);
  }

  Future<bool> _doRefresh() async {
    try {
      final response = await _refreshDio.post<Map<String, dynamic>>(
        '/auth/refresh',
      );
      final token = response.data?['accessToken'] as String?;
      if (token == null || token.isEmpty) {
        await _expire();
        return false;
      }
      await tokens.save(token);
      return true;
    } on DioException {
      await _expire();
      return false;
    }
  }

  Future<void> _expire() async {
    await tokens.clear();
    onSessionExpired?.call();
  }

  // ── Typed request helpers ──────────────────────────────────────────────────

  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    final res = await _send(() => _dio.get<Map<String, dynamic>>(
          path,
          queryParameters: _clean(query),
        ));
    return res ?? const {};
  }

  Future<List<dynamic>> getList(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    final res = await _send(
      () => _dio.get<List<dynamic>>(path, queryParameters: _clean(query)),
    );
    return res ?? const [];
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
  }) async {
    final res = await _send(() => _dio.post<Map<String, dynamic>>(
          path,
          data: body,
          queryParameters: _clean(query),
        ));
    return res ?? const {};
  }

  Future<Map<String, dynamic>> patch(String path, {Object? body}) async {
    final res = await _send(
      () => _dio.patch<Map<String, dynamic>>(path, data: body),
    );
    return res ?? const {};
  }

  Future<void> delete(String path) async {
    await _send(() => _dio.delete<dynamic>(path));
  }

  Future<T?> _send<T>(Future<Response<T>> Function() request) async {
    try {
      final response = await request();
      return response.data;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  /// Drops null/empty query values so optional filters aren't sent.
  Map<String, dynamic>? _clean(Map<String, dynamic>? query) {
    if (query == null) return null;
    final cleaned = <String, dynamic>{};
    query.forEach((key, value) {
      if (value != null && value != '') cleaned[key] = value;
    });
    return cleaned.isEmpty ? null : cleaned;
  }
}
