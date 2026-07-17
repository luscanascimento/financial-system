# FinanceHub Mobile (Flutter)

A Flutter client for the FinanceHub API — the same screens as the Angular web
app: **Dashboard, Accounts, Transactions, Budgets, Goals, Categories**, plus the
full auth flow (login, register, forgot/reset password, email verification).

It talks to the **same REST API** with no backend changes: the short-lived
access token is attached as a bearer header, and the rotating refresh token is
carried in the httpOnly cookie (persisted via a Dio cookie jar), exactly like
the web client — including single-flight refresh on `401`.

## Stack

| Concern        | Choice                                          |
| -------------- | ----------------------------------------------- |
| State          | `flutter_riverpod`                              |
| HTTP           | `dio` + `dio_cookie_manager` + `cookie_jar`     |
| Routing        | `go_router` (auth-aware redirect guard)         |
| Secure storage | `flutter_secure_storage` (access token)         |
| Formatting     | `intl` (currency + dates)                       |

## Project layout

```
lib/
  main.dart                     # bootstraps ApiClient, injects it into Riverpod
  src/
    app.dart                    # MaterialApp.router + theme
    core/
      config/env.dart           # API base URL (via --dart-define)
      network/                  # ApiClient (bearer + refresh), ApiException
      storage/token_store.dart  # access-token persistence
      theme/                    # M3 light/dark + persisted toggle
      format/                   # Money (minor units) + Dates helpers
      widgets/                  # AsyncView, MoneyText, KpiCard, EmptyState, AppShell
      providers.dart            # apiClientProvider
    models/                     # domain models mirroring shared-types
    routing/app_router.dart     # routes + auth redirect
    features/
      auth/                     # controller + 5 screens + splash
      dashboard/ accounts/ transactions/ budgets/ goals/ categories/
```

Each feature follows the same pattern: a `*_providers.dart` (repository +
`FutureProvider`) and a `*_screen.dart` (`ConsumerWidget` using `AsyncView`,
`RefreshIndicator` and a bottom-sheet form for create/edit).

## Getting started

Requires **Flutter 3.35+**. Verified on Flutter 3.44 (`flutter analyze` clean,
`flutter test` green, `flutter build web` succeeds). Flutter is **not** vendored
in this repo. From `apps/mobile`:

```bash
# 1. Generate the platform folders (android/ios/web/…) for this package.
flutter create .

# 2. Fetch dependencies.
flutter pub get

# 3. Run, pointing at your API. Defaults to the Android-emulator host loopback
#    (10.0.2.2). Use localhost for iOS simulator / desktop / web.
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api      # Android emulator
flutter run --dart-define=API_BASE_URL=http://localhost:3000/api     # iOS sim / desktop
```

Bring the API up first (`docker compose up` at the repo root, or `nx serve api`).

### Configuration (`--dart-define`)

| Key            | Default                        | Notes                              |
| -------------- | ------------------------------ | ---------------------------------- |
| `API_BASE_URL` | `http://10.0.2.2:3000/api`     | Include the `/api` global prefix.  |
| `APP_LOCALE`   | `en_US`                        | BCP-47 locale for currency/dates.  |

> **Android cleartext:** talking to a plain-HTTP dev API requires
> `android:usesCleartextTraffic="true"` in the generated
> `android/app/src/main/AndroidManifest.xml` (development only). Production
> should use HTTPS.

## Analyze & test

```bash
flutter analyze
flutter test
```

## Notes / parity

- **MFA:** if an account has MFA enabled, login returns a challenge; the app
  surfaces a message directing the user to the web app (full MFA-at-login is a
  backend slice not yet wired end-to-end, matching the web client's behaviour).
- **Deep links:** password-reset / email-verify screens accept the `token`
  query parameter and also allow manual entry, so they work without configuring
  platform deep links.
