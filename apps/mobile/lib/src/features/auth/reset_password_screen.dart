import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_exception.dart';
import 'auth_controller.dart';
import 'widgets/auth_scaffold.dart';

class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key, this.token});

  /// Reset token, typically supplied via the email deep link `?token=…`.
  final String? token;

  @override
  ConsumerState<ResetPasswordScreen> createState() =>
      _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _token =
      TextEditingController(text: widget.token ?? '');
  final _password = TextEditingController();
  bool _submitting = false;
  bool _done = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _token.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).resetPassword(
            token: _token.text.trim(),
            password: _password.text,
          );
      if (mounted) setState(() => _done = true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Choose a new password',
      subtitle: 'Enter the token from your email and a new password.',
      children: [
        if (_done)
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const ListTile(
                leading: Icon(Icons.check_circle_outline),
                title: Text('Password updated'),
                subtitle: Text('You can now sign in with your new password.'),
                contentPadding: EdgeInsets.zero,
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => context.go('/auth/login'),
                child: const Text('Back to sign in'),
              ),
            ],
          )
        else
          Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AuthError(_error),
                TextFormField(
                  controller: _token,
                  decoration: const InputDecoration(labelText: 'Reset token'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Paste your token' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _password,
                  obscureText: _obscure,
                  decoration: InputDecoration(
                    labelText: 'New password',
                    helperText: 'At least 8 characters',
                    suffixIcon: IconButton(
                      icon: Icon(
                          _obscure ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                  ),
                  validator: (v) => (v == null || v.length < 8)
                      ? 'Use at least 8 characters'
                      : null,
                  onFieldSubmitted: (_) => _submit(),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: _submitting ? null : _submit,
                  child: _submitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Update password'),
                ),
                TextButton(
                  onPressed: () => context.go('/auth/login'),
                  child: const Text('Back to sign in'),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
