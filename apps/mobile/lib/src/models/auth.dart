import 'enums.dart';

/// The authenticated user projection returned by the API (never secrets).
class AuthUser {
  const AuthUser({
    required this.id,
    required this.email,
    required this.displayName,
    required this.role,
    required this.emailVerified,
    required this.mfaEnabled,
    required this.createdAt,
  });

  final String id;
  final String email;
  final String displayName;
  final Role role;
  final bool emailVerified;
  final bool mfaEnabled;
  final DateTime createdAt;

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        email: json['email'] as String,
        displayName: json['displayName'] as String,
        role: Role.fromWire(json['role'] as String),
        emailVerified: json['emailVerified'] as bool? ?? false,
        mfaEnabled: json['mfaEnabled'] as bool? ?? false,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  String get initials {
    final parts =
        displayName.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1))
        .toUpperCase();
  }
}

/// Successful authentication result (access token + user). The refresh token is
/// delivered separately as an httpOnly cookie.
class AuthResult {
  const AuthResult({
    required this.user,
    required this.accessToken,
    required this.tokenType,
    required this.expiresIn,
  });

  final AuthUser user;
  final String accessToken;
  final String tokenType;
  final int expiresIn;

  factory AuthResult.fromJson(Map<String, dynamic> json) => AuthResult(
        user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
        accessToken: json['accessToken'] as String,
        tokenType: json['tokenType'] as String? ?? 'Bearer',
        expiresIn: (json['expiresIn'] as num?)?.toInt() ?? 0,
      );
}

/// When MFA is enabled, login returns a challenge instead of tokens.
class MfaChallenge {
  const MfaChallenge({required this.mfaToken});
  final String mfaToken;

  factory MfaChallenge.fromJson(Map<String, dynamic> json) =>
      MfaChallenge(mfaToken: json['mfaToken'] as String? ?? '');
}

/// Login can resolve to either a full session or an MFA challenge.
sealed class LoginResponse {
  const LoginResponse();

  factory LoginResponse.fromJson(Map<String, dynamic> json) =>
      json['mfaRequired'] == true
          ? LoginChallenge(MfaChallenge.fromJson(json))
          : LoginSuccess(AuthResult.fromJson(json));
}

class LoginSuccess extends LoginResponse {
  const LoginSuccess(this.result);
  final AuthResult result;
}

class LoginChallenge extends LoginResponse {
  const LoginChallenge(this.challenge);
  final MfaChallenge challenge;
}
