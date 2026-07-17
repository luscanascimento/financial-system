import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../models/auth.dart';
import 'auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.watch(apiClientProvider)),
);

/// Snapshot of the authenticated session.
class AuthState {
  const AuthState({this.user, this.initializing = true});

  final AuthUser? user;

  /// True until the first session-restore attempt completes (splash gating).
  final bool initializing;

  bool get isAuthenticated => user != null;

  AuthState copyWith({AuthUser? user, bool clearUser = false, bool? initializing}) =>
      AuthState(
        user: clearUser ? null : (user ?? this.user),
        initializing: initializing ?? this.initializing,
      );
}

/// Owns the authenticated session and the auth use-cases. On construction it
/// wires the API client's session-expiry callback and attempts a silent
/// restore from the persisted token / refresh cookie.
class AuthController extends StateNotifier<AuthState> {
  AuthController(this._ref) : super(const AuthState()) {
    _ref.read(apiClientProvider).onSessionExpired = _onSessionExpired;
    _restore();
  }

  final Ref _ref;

  AuthRepository get _repo => _ref.read(authRepositoryProvider);

  Future<void> _restore() async {
    try {
      final user = await _repo.currentUser();
      state = AuthState(user: user, initializing: false);
    } catch (_) {
      state = const AuthState(initializing: false);
    }
  }

  /// Logs in. Returns the challenge when the account requires MFA (the caller
  /// surfaces it), otherwise resolves the session.
  Future<MfaChallenge?> login(String email, String password) async {
    final response = await _repo.login(email, password);
    switch (response) {
      case LoginSuccess(:final result):
        state = AuthState(user: result.user, initializing: false);
        return null;
      case LoginChallenge(:final challenge):
        return challenge;
    }
  }

  Future<void> register({
    required String email,
    required String displayName,
    required String password,
  }) async {
    final result = await _repo.register(
      email: email,
      displayName: displayName,
      password: password,
    );
    state = AuthState(user: result.user, initializing: false);
  }

  Future<void> updateProfile(String displayName) async {
    final user = await _repo.updateProfile(displayName: displayName);
    state = state.copyWith(user: user);
  }

  Future<void> logout() async {
    try {
      await _repo.logout();
    } catch (_) {
      // Best-effort: clear locally even if the network call fails.
    }
    await _ref.read(apiClientProvider).tokens.clear();
    state = const AuthState(initializing: false);
  }

  void _onSessionExpired() {
    if (mounted) state = const AuthState(initializing: false);
  }
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>(
  (ref) => AuthController(ref),
);
