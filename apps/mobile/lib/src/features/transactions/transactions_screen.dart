import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format/dates.dart';
import '../../core/format/money.dart';
import '../../core/network/api_exception.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/money_text.dart';
import '../../models/account.dart';
import '../../models/category.dart';
import '../../models/enums.dart';
import '../../models/paginated.dart';
import '../../models/transaction.dart';
import '../accounts/accounts_providers.dart';
import '../categories/categories_providers.dart';
import 'transactions_providers.dart';

/// Lists the user's transactions as a ledger and lets them add or delete an
/// entry — mirroring the web Transactions screen.
class TransactionsScreen extends ConsumerWidget {
  const TransactionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final page = ref.watch(transactionsProvider);
    final accounts = ref.watch(accountsProvider);
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Add'),
      ),
      body: AsyncView<Paginated<Transaction>>(
        value: page,
        onRetry: () => ref.invalidate(transactionsProvider),
        data: (paged) {
          final items = paged.items;
          if (items.isEmpty) {
            return EmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'No transactions yet',
              subtitle: 'Record your first income or expense to get started.',
              action: FilledButton.icon(
                onPressed: () => _openForm(context, ref),
                icon: const Icon(Icons.add),
                label: const Text('Add'),
              ),
            );
          }
          final accountsList = accounts.valueOrNull ?? const <Account>[];
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(transactionsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 4),
              itemBuilder: (context, index) {
                final t = items[index];
                final account = _accountFor(accountsList, t.accountId);
                final isIncome = t.type == FlowType.income;
                final accountName = accounts.isLoading && account == null
                    ? '—'
                    : (account?.name ?? '—');
                return Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: (isIncome
                              ? AppTheme.positive(context)
                              : AppTheme.negative(context))
                          .withValues(alpha: 0.15),
                      child: Icon(
                        isIncome ? Icons.arrow_downward : Icons.arrow_upward,
                        color: isIncome
                            ? AppTheme.positive(context)
                            : AppTheme.negative(context),
                      ),
                    ),
                    title: Text(t.description),
                    subtitle: Text('${Dates.medium(t.date)} · $accountName'),
                    trailing: MoneyText(
                      t.signedMinor,
                      account?.currency ?? 'USD',
                      signed: true,
                      colored: true,
                    ),
                    onLongPress: () => _confirmDelete(context, ref, t),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Account? _accountFor(List<Account> accounts, String id) {
    for (final a in accounts) {
      if (a.id == id) return a;
    }
    return null;
  }

  Future<void> _openForm(BuildContext context, WidgetRef ref) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _TransactionForm(),
    );
    if (saved == true) ref.invalidate(transactionsProvider);
  }

  Future<void> _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    Transaction transaction,
  ) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete transaction?'),
        content: Text('“${transaction.description}” will be permanently removed.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ref.read(transactionsRepositoryProvider).delete(transaction.id);
      ref.invalidate(transactionsProvider);
    } on ApiException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }
}

/// Create form rendered in a bottom sheet.
class _TransactionForm extends ConsumerStatefulWidget {
  const _TransactionForm();

  @override
  ConsumerState<_TransactionForm> createState() => _TransactionFormState();
}

class _TransactionFormState extends ConsumerState<_TransactionForm> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _description = TextEditingController();
  final _notes = TextEditingController();

  FlowType _type = FlowType.expense;
  String? _accountId;
  String? _categoryId;
  DateTime _date = DateTime.now();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _amount.dispose();
    _description.dispose();
    _notes.dispose();
    super.dispose();
  }

  String _labelFor(FlowType type) =>
      type == FlowType.income ? 'Income' : 'Expense';

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_accountId == null) {
      setState(() => _error = 'Select an account');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final repo = ref.read(transactionsRepositoryProvider);
    final notes = _notes.text.trim().isEmpty ? null : _notes.text.trim();
    // The amount is typed in the *account's* currency, whose minor-unit
    // exponent is not always 2 (JPY has 0).
    final account = (ref.read(accountsProvider).valueOrNull ?? const <Account>[])
        .cast<Account?>()
        .firstWhere((a) => a?.id == _accountId, orElse: () => null);
    try {
      await repo.create({
        'accountId': _accountId,
        'type': _type.wire,
        'amountMinor': Money.majorToMinor(
            double.parse(_amount.text.trim()), account?.currency ?? 'USD'),
        'description': _description.text.trim(),
        'date': Dates.toIso(_date),
        if (_categoryId != null) 'categoryId': _categoryId,
        if (notes != null) 'notes': notes,
      });
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final accounts = ref.watch(accountsProvider);
    final categories = ref.watch(categoriesProvider);

    final accountItems = accounts.valueOrNull ?? const <Account>[];
    final allCategories = categories.valueOrNull ?? const <Category>[];
    final categoryItems =
        allCategories.where((c) => c.type == _type).toList();
    // Drop a stale selection when it no longer matches the chosen type.
    if (_categoryId != null &&
        !categoryItems.any((c) => c.id == _categoryId)) {
      _categoryId = null;
    }

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
                'New transaction',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              if (_error != null) ...[
                Text(_error!,
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.error)),
                const SizedBox(height: 12),
              ],
              SegmentedButton<FlowType>(
                segments: [
                  for (final t in FlowType.values)
                    ButtonSegment(value: t, label: Text(_labelFor(t))),
                ],
                selected: {_type},
                onSelectionChanged: (selection) =>
                    setState(() => _type = selection.first),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _accountId,
                decoration: const InputDecoration(labelText: 'Account'),
                items: [
                  for (final a in accountItems)
                    DropdownMenuItem(value: a.id, child: Text(a.name)),
                ],
                onChanged: accounts.isLoading
                    ? null
                    : (v) => setState(() => _accountId = v),
                validator: (v) => v == null ? 'Select an account' : null,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String?>(
                initialValue: _categoryId,
                decoration:
                    const InputDecoration(labelText: 'Category (optional)'),
                items: [
                  const DropdownMenuItem<String?>(
                    value: null,
                    child: Text('None'),
                  ),
                  for (final c in categoryItems)
                    DropdownMenuItem<String?>(value: c.id, child: Text(c.name)),
                ],
                onChanged: categories.isLoading
                    ? null
                    : (v) => setState(() => _categoryId = v),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _amount,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Amount'),
                validator: (v) => double.tryParse(v?.trim() ?? '') == null
                    ? 'Enter an amount'
                    : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _description,
                decoration: const InputDecoration(labelText: 'Description'),
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'Enter a description'
                    : null,
              ),
              const SizedBox(height: 12),
              InputDecorator(
                decoration: const InputDecoration(labelText: 'Date'),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(Dates.medium(_date)),
                    TextButton.icon(
                      onPressed: _pickDate,
                      icon: const Icon(Icons.calendar_today, size: 18),
                      label: const Text('Change'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _notes,
                minLines: 1,
                maxLines: 3,
                decoration:
                    const InputDecoration(labelText: 'Notes (optional)'),
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
                    : const Text('Add transaction'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
