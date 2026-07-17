import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format/dates.dart';
import '../../core/format/money.dart';
import '../../core/network/api_exception.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/money_text.dart';
import '../../models/budget.dart';
import '../../models/category.dart';
import '../../models/enums.dart';
import '../categories/categories_providers.dart';
import 'budgets_providers.dart';

/// Fixed display currency: budgets carry no currency of their own.
const String _kBudgetCurrency = 'USD';

/// Lists the user's budgets as progress cards, and lets them create or delete a
/// budget — mirroring the web Budgets screen.
class BudgetsScreen extends ConsumerWidget {
  const BudgetsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final budgets = ref.watch(budgetsProvider);
    final categories = ref.watch(categoriesProvider);
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('New budget'),
      ),
      body: AsyncView<List<BudgetProgress>>(
        value: budgets,
        onRetry: () => ref.invalidate(budgetsProvider),
        data: (items) {
          if (items.isEmpty) {
            return EmptyState(
              icon: Icons.pie_chart_outline,
              title: 'No budgets yet',
              subtitle: 'Set a spending cap to keep your categories in check.',
              action: FilledButton.icon(
                onPressed: () => _openForm(context, ref),
                icon: const Icon(Icons.add),
                label: const Text('New budget'),
              ),
            );
          }
          final categoryNames = <String, String>{
            for (final c in categories.valueOrNull ?? const <Category>[])
              c.id: c.name,
          };
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(budgetsProvider),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              children: [
                for (final budget in items)
                  _BudgetCard(
                    budget: budget,
                    categoryName: budget.categoryId == null
                        ? 'All spending'
                        : categoryNames[budget.categoryId] ?? 'All spending',
                    onLongPress: () => _confirmDelete(context, ref, budget),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _openForm(BuildContext context, WidgetRef ref) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _BudgetForm(),
    );
    if (saved == true) ref.invalidate(budgetsProvider);
  }

  Future<void> _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    BudgetProgress budget,
  ) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete budget?'),
        content: Text('“${budget.name}” will be permanently removed.'),
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
      await ref.read(budgetsRepositoryProvider).delete(budget.id);
      ref.invalidate(budgetsProvider);
    } on ApiException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }
}

/// A single budget rendered as a progress card.
class _BudgetCard extends StatelessWidget {
  const _BudgetCard({
    required this.budget,
    required this.categoryName,
    required this.onLongPress,
  });

  final BudgetProgress budget;
  final String categoryName;
  final VoidCallback onLongPress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final over = budget.isOverBudget;
    final progressColor = over ? scheme.error : scheme.primary;
    return Card(
      child: InkWell(
        onLongPress: onLongPress,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(budget.name, style: theme.textTheme.titleMedium),
              const SizedBox(height: 2),
              Text(
                '${budget.period.label} · $categoryName',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  value: budget.ratio.clamp(0.0, 1.0),
                  minHeight: 8,
                  backgroundColor: scheme.surfaceContainerHighest,
                  valueColor: AlwaysStoppedAnimation<Color>(progressColor),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Spent',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 2),
                      DefaultTextStyle.merge(
                        style: theme.textTheme.bodyMedium,
                        child: Row(
                          children: [
                            MoneyText(
                              budget.spentMinor,
                              _kBudgetCurrency,
                              style: theme.textTheme.bodyMedium,
                            ),
                            Text(
                              ' of ',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: scheme.onSurfaceVariant,
                              ),
                            ),
                            MoneyText(
                              budget.amountMinor,
                              _kBudgetCurrency,
                              style: theme.textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'Remaining',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 2),
                      MoneyText(
                        budget.remainingMinor,
                        _kBudgetCurrency,
                        colored: true,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: over ? AppTheme.negative(context) : null,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Create form rendered in a bottom sheet.
class _BudgetForm extends ConsumerStatefulWidget {
  const _BudgetForm();

  @override
  ConsumerState<_BudgetForm> createState() => _BudgetFormState();
}

class _BudgetFormState extends ConsumerState<_BudgetForm> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _amount = TextEditingController();
  String? _categoryId;
  BudgetPeriod _period = BudgetPeriod.monthly;
  DateTime _startDate = DateTime.now();
  bool _rollover = false;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _pickStartDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 5),
    );
    if (picked != null) setState(() => _startDate = picked);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    final repo = ref.read(budgetsRepositoryProvider);
    try {
      await repo.create({
        'name': _name.text.trim(),
        'amountMinor': Money.majorToMinor(double.parse(_amount.text.trim())),
        if (_categoryId != null) 'categoryId': _categoryId,
        'period': _period.wire,
        'startDate': Dates.toIso(_startDate),
        'rollover': _rollover,
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
    final categories = ref.watch(categoriesProvider).valueOrNull ??
        const <Category>[];
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
                'New budget',
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
              DropdownButtonFormField<String?>(
                value: _categoryId,
                decoration:
                    const InputDecoration(labelText: 'Category (optional)'),
                items: [
                  const DropdownMenuItem<String?>(
                    value: null,
                    child: Text('All spending'),
                  ),
                  for (final c in categories)
                    DropdownMenuItem<String?>(
                      value: c.id,
                      child: Text(c.name),
                    ),
                ],
                onChanged: (id) => setState(() => _categoryId = id),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<BudgetPeriod>(
                value: _period,
                decoration: const InputDecoration(labelText: 'Period'),
                items: [
                  for (final p in BudgetPeriod.values)
                    DropdownMenuItem(value: p, child: Text(p.label)),
                ],
                onChanged: (p) => setState(() => _period = p ?? _period),
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: _pickStartDate,
                child: InputDecorator(
                  decoration: const InputDecoration(labelText: 'Start date'),
                  child: Text(Dates.medium(_startDate)),
                ),
              ),
              const SizedBox(height: 4),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Roll over unspent amount'),
                value: _rollover,
                onChanged: (v) => setState(() => _rollover = v),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Create budget'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
