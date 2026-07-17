import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'network/api_client.dart';

/// The app's single [ApiClient]. Because construction is async (cookie jar +
/// token load), the real instance is created in `main()` and injected here via
/// a `ProviderScope` override. Reading it without that override is a bug.
final apiClientProvider = Provider<ApiClient>(
  (ref) => throw UnimplementedError(
    'apiClientProvider must be overridden in main() with ApiClient.create()',
  ),
);
