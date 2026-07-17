import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'src/app.dart';
import 'src/core/network/api_client.dart';
import 'src/core/providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // The API client is created up-front (async: cookie jar + persisted token)
  // and injected so every provider shares one authenticated HTTP gateway.
  final apiClient = await ApiClient.create();

  runApp(
    ProviderScope(
      overrides: [apiClientProvider.overrideWithValue(apiClient)],
      child: const FinanceHubApp(),
    ),
  );
}
