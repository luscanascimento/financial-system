import 'package:flutter/material.dart';

/// Shown while the session-restore probe runs at startup.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.account_balance_wallet, size: 56, color: scheme.primary),
            const SizedBox(height: 16),
            Text('FinanceHub', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 24),
            const CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
