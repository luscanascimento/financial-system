import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_exception.dart';
import 'auth_controller.dart';
import 'widgets/auth_scaffold.dart';

class VerifyEmailScreen extends ConsumerStatefulWidget {
  const VerifyEmailScreen({super.key, this.token});

  /// Verification token from the email deep link `?token=…`.
  final String? token;

  @override
  ConsumerState<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends ConsumerState<VerifyEmailScreen> {
  late Future<void>? _verification =
      (widget.token != null && widget.token!.isNotEmpty)
          ? _verify(widget.token!)
          : null;

  Future<void> _verify(String token) =>
      ref.read(authRepositoryProvider).verifyEmail(token);

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Verify your email',
      subtitle: 'Confirming your email address.',
      children: [
        if (_verification == null)
          const ListTile(
            leading: Icon(Icons.mark_email_unread_outlined),
            title: Text('No verification token'),
            subtitle: Text('Open the link from your verification email.'),
            contentPadding: EdgeInsets.zero,
          )
        else
          FutureBuilder<void>(
            future: _verification,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              if (snapshot.hasError) {
                final message = snapshot.error is ApiException
                    ? (snapshot.error as ApiException).message
                    : 'Verification failed or the link has expired.';
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    AuthError(message),
                    const SizedBox(height: 8),
                  ],
                );
              }
              return const ListTile(
                leading: Icon(Icons.verified_outlined),
                title: Text('Email verified'),
                subtitle: Text('Your email address is now confirmed.'),
                contentPadding: EdgeInsets.zero,
              );
            },
          ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: () => context.go('/auth/login'),
          child: const Text('Continue to sign in'),
        ),
      ],
    );
  }
}
