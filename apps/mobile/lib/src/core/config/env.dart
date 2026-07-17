/// Compile-time configuration, overridable via `--dart-define`.
///
/// The API base URL includes the `/api` global prefix. The default targets a
/// locally-running API from the Android emulator (`10.0.2.2` maps to the host
/// loopback). Override for other targets, e.g.:
///
///   flutter run --dart-define=API_BASE_URL=https://api.financehub.example/api
///
/// iOS simulator / desktop can use `http://localhost:3000/api`.
class Env {
  const Env._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api',
  );

  /// BCP-47 locale used for currency/date formatting.
  static const String locale = String.fromEnvironment(
    'APP_LOCALE',
    defaultValue: 'en_US',
  );
}
