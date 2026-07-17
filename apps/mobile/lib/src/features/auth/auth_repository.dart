import '../../core/network/api_client.dart';
import '../../models/auth.dart';

/// Thin wrapper over the `/auth` and `/users/me` endpoints. Token/cookie
/// handling lives entirely in [ApiClient]; this just maps request/response.
class AuthRepository {
  const AuthRepository(this._api);

  final ApiClient _api;

  Future<LoginResponse> login(String email, String password) async {
    final json = await _api.post('/auth/login', body: {
      'email': email,
      'password': password,
    });
    return LoginResponse.fromJson(json);
  }

  Future<AuthResult> register({
    required String email,
    required String displayName,
    required String password,
  }) async {
    final json = await _api.post('/auth/register', body: {
      'email': email,
      'displayName': displayName,
      'password': password,
    });
    return AuthResult.fromJson(json);
  }

  /// Restores the session from the persisted access token / refresh cookie by
  /// fetching the current profile (the API client refreshes transparently).
  Future<AuthUser> currentUser() async {
    final json = await _api.getJson('/users/me');
    return AuthUser.fromJson(json);
  }

  Future<AuthUser> updateProfile({required String displayName}) async {
    final json = await _api.patch('/users/me', body: {
      'displayName': displayName,
    });
    return AuthUser.fromJson(json);
  }

  Future<void> forgotPassword(String email) =>
      _api.post('/auth/forgot-password', body: {'email': email});

  Future<void> resetPassword({
    required String token,
    required String password,
  }) =>
      _api.post('/auth/reset-password', body: {
        'token': token,
        'password': password,
      });

  Future<void> verifyEmail(String token) =>
      _api.post('/auth/verify-email', body: {'token': token});

  Future<void> resendVerification(String email) =>
      _api.post('/auth/resend-verification', body: {'email': email});

  Future<void> logout() => _api.post('/auth/logout');
}
