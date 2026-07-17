import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format/money.dart';
import '../../core/network/api_exception.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/money_text.dart';
import '../../models/account.dart';
import '../../models/enums.dart';
import 'accounts_providers.dart';

/// Lists the user's accounts with their balances, and lets them create, edit or
/// archive an account — mirroring the web Accounts screen.
class AccountsScreen extends ConsumerWidget {
  const AccountsScreen({super.key});

  IconData _iconFor(AccountType type) => switch (type) {
        AccountType.checking => Icons.account_balance,
        AccountType.savings => Icons.savings,
        AccountType.creditCard => Icons.credit_card,
        AccountType.cash => Icons.payments,
        AccountType.wallet => Icons.account_balance_wallet,
        AccountType.investment => Icons.trending_up,
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final accounts = ref.watch(accountsProvider);
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('New account'),
      ),
      body: AsyncView<List<Account>>(
        value: accounts,
        onRetry: () => ref.invalidate(accountsProvider),
        data: (items) {
          if (items.isEmpty) {
            return EmptyState(
              icon: Icons.account_balance_outlined,
              title: 'No accounts yet',
              subtitle: 'Add your first account to start tracking money.',
              action: FilledButton.icon(
                onPressed: () => _openForm(context, ref),
                icon: const Icon(Icons.add),
                label: const Text('New account'),
              ),
            );
          }
          final total = items.fold<int>(0, (sum, a) => sum + a.balanceMinor);
          final currency = items.first.currency;
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(accountsProvider),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              children: [
                Card(
                  child: ListTile(
                    title: const Text('Total balance'),
                    trailing: MoneyText(
                      total,
                      currency,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                for (final account in items)
                  Card(
                    child: ListTile(
                      leading: CircleAvatar(child: Icon(_iconFor(account.type))),
                      title: Text(account.name),
                      subtitle: Text(
                        account.institution == null
                            ? account.type.label
                            : '${account.type.label} · ${account.institution}',
                      ),
                      trailing: MoneyText(
                        account.balanceMinor,
                        account.currency,
                        colored: true,
                      ),
                      onTap: () => _openForm(context, ref, account: account),
                      onLongPress: () => _confirmArchive(context, ref, account),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _openForm(
    BuildContext context,
    WidgetRef ref, {
    Account? account,
  }) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _AccountForm(account: account),
    );
    if (saved == true) ref.invalidate(accountsProvider);
  }

  Future<void> _confirmArchive(
    BuildContext context,
    WidgetRef ref,
    Account account,
  ) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Archive account?'),
        content: Text('“${account.name}” will be hidden from your accounts.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Archive'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ref.read(accountsRepositoryProvider).archive(account.id);
      ref.invalidate(accountsProvider);
    } on ApiException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }
}

/// Create/edit form rendered in a bottom sheet.
class _AccountForm extends ConsumerStatefulWidget {
  const _AccountForm({this.account});
  final Account? account;

  @override
  ConsumerState<_AccountForm> createState() => _AccountFormState();
}

class _AccountFormState extends ConsumerState<_AccountForm> {
  final _formKey = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.account?.name ?? '');
  late final _institution =
      TextEditingController(text: widget.account?.institution ?? '');
  late final _balance = TextEditingController(
    text: widget.account == null
        ? ''
        : Money.minorToMajor(widget.account!.initialBalanceMinor)
            .toStringAsFixed(2),
  );
  late final _currency =
      TextEditingController(text: widget.account?.currency ?? 'USD');
  late AccountType _type = widget.account?.type ?? AccountType.checking;
  bool _saving = false;
  String? _error;

  bool get _isEdit => widget.account != null;

  @override
  void dispose() {
    _name.dispose();
    _institution.dispose();
    _balance.dispose();
    _currency.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    final repo = ref.read(accountsRepositoryProvider);
    final institution =
        _institution.text.trim().isEmpty ? null : _institution.text.trim();
    try {
      if (_isEdit) {
        await repo.update(widget.account!.id, {
          'name': _name.text.trim(),
          'institution': institution,
        });
      } else {
        await repo.create({
          'name': _name.text.trim(),
          'type': _type.wire,
          'currency': _currency.text.trim().toUpperCase(),
          'initialBalanceMinor':
              Money.majorToMinor(double.parse(_balance.text.trim())),
          if (institution != null) 'institution': institution,
        });
      }
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                _isEdit ? 'Edit account' : 'New account',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              if (_error != null) ...[
                Text(_error!,
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.error)),
                const SizedBox(height: 12),
              ],
              TextFormField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Name'),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Enter a name' : null,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<AccountType>(
                initialValue: _type,
                decoration: const InputDecoration(labelText: 'Type'),
                items: [
                  for (final t in AccountType.values)
                    DropdownMenuItem(value: t, child: Text(t.label)),
                ],
                onChanged: _isEdit
                    ? null
                    : (t) => setState(() => _type = t ?? _type),
              ),
              const SizedBox(height: 12),
              if (!_isEdit) ...[
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: TextFormField(
                        controller: _balance,
                        keyboardType: const TextInputType.numberWithOptions(
                            decimal: true),
                        decoration: const InputDecoration(
                            labelText: 'Opening balance'),
                        validator: (v) =>
                            double.tryParse(v?.trim() ?? '') == null
                                ? 'Enter an amount'
                                : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _currency,
                        textCapitalization: TextCapitalization.characters,
                        decoration:
                            const InputDecoration(labelText: 'Currency'),
                        validator: (v) => (v == null || v.trim().length != 3)
                            ? '3 letters'
                            : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ],
              TextFormField(
                controller: _institution,
                decoration: const InputDecoration(
                    labelText: 'Institution (optional)'),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(_isEdit ? 'Save changes' : 'Create account'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
