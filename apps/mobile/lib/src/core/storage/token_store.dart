import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists the short-lived access token in platform secure storage and mirrors
/// it in memory for synchronous access on every outgoing request. The rotating
/// refresh token is never stored here — it lives in the httpOnly cookie managed
/// by the Dio cookie jar, exactly as on the web client.
class TokenStore {
  TokenStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'fh_access_token';

  final FlutterSecureStorage _storage;
  String? _accessToken;

  String? get accessToken => _accessToken;
  bool get hasToken => _accessToken != null && _accessToken!.isNotEmpty;

  /// Loads the persisted token into memory at startup.
  Future<void> load() async {
    _accessToken = await _storage.read(key: _key);
  }

  Future<void> save(String token) async {
    _accessToken = token;
    await _storage.write(key: _key, value: token);
  }

  Future<void> clear() async {
    _accessToken = null;
    await _storage.delete(key: _key);
  }
}
