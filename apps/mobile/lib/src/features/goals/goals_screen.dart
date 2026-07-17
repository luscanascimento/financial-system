import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format/dates.dart';
import '../../core/format/money.dart';
import '../../core/network/api_exception.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/money_text.dart';
import '../../models/account.dart';
import '../../models/goal.dart';
import '../accounts/accounts_providers.dart';
import 'goals_providers.dart';

/// Lists the user's savings goals as progress cards, and lets them create,
/// fund (via contributions) or delete a goal — mirroring the web Goals screen.
class GoalsScreen extends ConsumerWidget {
  const GoalsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final goals = ref.watch(goalsProvider);
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('New goal'),
      ),
      body: AsyncView<List<Goal>>(
        value: goals,
        onRetry: () => ref.invalidate(goalsProvider),
        data: (items) {
          if (items.isEmpty) {
            return EmptyState(
              icon: Icons.flag_outlined,
              title: 'No goals yet',
              subtitle: 'Set a savings goal and track your progress.',
              action: FilledButton.icon(
                onPressed: () => _openForm(context, ref),
                icon: const Icon(Icons.add),
                label: const Text('New goal'),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(goalsProvider),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              children: [
                for (final goal in items)
                  _GoalCard(
                    goal: goal,
                    onTap: () => _openContributions(context, ref, goal),
                    onLongPress: () => _confirmDelete(context, ref, goal),
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
      builder: (_) => const _GoalForm(),
    );
    if (saved == true) ref.invalidate(goalsProvider);
  }

  Future<void> _openContributions(
    BuildContext context,
    WidgetRef ref,
    Goal goal,
  ) async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _ContributionsSheet(goal: goal),
    );
    if (changed == true) ref.invalidate(goalsProvider);
  }

  Future<void> _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    Goal goal,
  ) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete goal?'),
        content: Text('“${goal.name}” and its contributions will be removed.'),
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
      await ref.read(goalsRepositoryProvider).delete(goal.id);
      ref.invalidate(goalsProvider);
    } on ApiException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }
}

/// A single goal rendered as a progress card.
class _GoalCard extends StatelessWidget {
  const _GoalCard({
    required this.goal,
    required this.onTap,
    required this.onLongPress,
  });

  final Goal goal;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final percent = (goal.ratio * 100).round();
    return Card(
      child: InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      goal.name,
                      style: theme.textTheme.titleMedium,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    '$percent%',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  value: goal.ratio,
                  minHeight: 8,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  MoneyText(
                    goal.currentAmountMinor,
                    goal.currency,
                    style: theme.textTheme.bodyMedium,
                  ),
                  Text(
                    ' of ',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  MoneyText(
                    goal.targetAmountMinor,
                    goal.currency,
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
              if (goal.targetDate != null) ...[
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(
                      Icons.event,
                      size: 16,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Target ${Dates.medium(goal.targetDate!)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Bottom sheet listing a goal's contributions with an "Add contribution"
/// action. Returns `true` when a contribution was added, so the caller can
/// refresh the goals list.
class _ContributionsSheet extends ConsumerStatefulWidget {
  const _ContributionsSheet({required this.goal});
  final Goal goal;

  @override
  ConsumerState<_ContributionsSheet> createState() =>
      _ContributionsSheetState();
}

class _ContributionsSheetState extends ConsumerState<_ContributionsSheet> {
  late Future<List<GoalContribution>> _future;
  bool _changed = false;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<GoalContribution>> _load() =>
      ref.read(goalsRepositoryProvider).contributions(widget.goal.id);

  void _reload() {
    setState(() => _future = _load());
  }

  Future<void> _addContribution() async {
    final added = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _ContributionForm(goal: widget.goal),
    );
    if (added == true) {
      _changed = true;
      _reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(widget.goal.name, style: theme.textTheme.titleLarge),
          const SizedBox(height: 4),
          Row(
            children: [
              MoneyText(
                widget.goal.currentAmountMinor,
                widget.goal.currency,
                style: theme.textTheme.bodyMedium,
              ),
              Text(
                ' of ',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              MoneyText(
                widget.goal.targetAmountMinor,
                widget.goal.currency,
                style: theme.textTheme.bodyMedium,
              ),
            ],
          ),
          const SizedBox(height: 16),
          ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.4,
            ),
            child: FutureBuilder<List<GoalContribution>>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                if (snapshot.hasError) {
                  final error = snapshot.error;
                  final message =
                      error is ApiException ? error.message : error.toString();
                  return AppErrorView(message: message, onRetry: _reload);
                }
                final items = snapshot.data ?? const <GoalContribution>[];
                if (items.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(child: Text('No contributions yet.')),
                  );
                }
                return ListView.builder(
                  shrinkWrap: true,
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final c = items[index];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const CircleAvatar(
                        child: Icon(Icons.savings_outlined),
                      ),
                      title: MoneyText(
                        c.amountMinor,
                        widget.goal.currency,
                        style: theme.textTheme.bodyLarge,
                      ),
                      subtitle: Text(
                        c.note == null
                            ? Dates.medium(c.date)
                            : '${Dates.medium(c.date)} · ${c.note}',
                      ),
                    );
                  },
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _addContribution,
            icon: const Icon(Icons.add),
            label: const Text('Add contribution'),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => Navigator.pop(context, _changed),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}

/// Form to add a contribution to a goal (amount in major units, date, note).
class _ContributionForm extends ConsumerStatefulWidget {
  const _ContributionForm({required this.goal});
  final Goal goal;

  @override
  ConsumerState<_ContributionForm> createState() => _ContributionFormState();
}

class _ContributionFormState extends ConsumerState<_ContributionForm> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _note = TextEditingController();
  DateTime _date = DateTime.now();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

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
    setState(() {
      _saving = true;
      _error = null;
    });
    final note = _note.text.trim().isEmpty ? null : _note.text.trim();
    try {
      await ref.read(goalsRepositoryProvider).addContribution(widget.goal.id, {
        'amountMinor': Money.majorToMinor(double.parse(_amount.text.trim())),
        'date': Dates.toIso(_date),
        if (note != null) 'note': note,
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
                'Add contribution',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              if (_error != null) ...[
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
                const SizedBox(height: 12),
              ],
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
              InkWell(
                onTap: _pickDate,
                child: InputDecorator(
                  decoration: const InputDecoration(labelText: 'Date'),
                  child: Text(Dates.medium(_date)),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _note,
                decoration:
                    const InputDecoration(labelText: 'Note (optional)'),
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
                    : const Text('Add contribution'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Create-goal form rendered in a bottom sheet.
class _GoalForm extends ConsumerStatefulWidget {
  const _GoalForm();

  @override
  ConsumerState<_GoalForm> createState() => _GoalFormState();
}

class _GoalFormState extends ConsumerState<_GoalForm> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _target = TextEditingController();
  final _currency = TextEditingController(text: 'USD');
  DateTime? _targetDate;
  String? _accountId;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _target.dispose();
    _currency.dispose();
    super.dispose();
  }

  Future<void> _pickTargetDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _targetDate ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) setState(() => _targetDate = picked);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(goalsRepositoryProvider).create({
        'name': _name.text.trim(),
        'targetAmountMinor':
            Money.majorToMinor(double.parse(_target.text.trim())),
        'currency': _currency.text.trim().toUpperCase(),
        if (_targetDate != null) 'targetDate': Dates.toIso(_targetDate!),
        if (_accountId != null) 'accountId': _accountId,
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
                'New goal',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              if (_error != null) ...[
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
                const SizedBox(height: 12),
              ],
              TextFormField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Name'),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Enter a name' : null,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: TextFormField(
                      controller: _target,
                      keyboardType: const TextInputType.numberWithOptions(
                          decimal: true),
                      decoration:
                          const InputDecoration(labelText: 'Target amount'),
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
                      decoration: const InputDecoration(labelText: 'Currency'),
                      validator: (v) => (v == null || v.trim().length != 3)
                          ? '3 letters'
                          : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              accounts.when(
                data: (items) => DropdownButtonFormField<String?>(
                  value: _accountId,
                  decoration: const InputDecoration(
                      labelText: 'Linked account (optional)'),
                  items: [
                    const DropdownMenuItem<String?>(
                      value: null,
                      child: Text('None'),
                    ),
                    for (final Account a in items)
                      DropdownMenuItem<String?>(
                        value: a.id,
                        child: Text(a.name),
                      ),
                  ],
                  onChanged: (v) => setState(() => _accountId = v),
                ),
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: _pickTargetDate,
                child: InputDecorator(
                  decoration: const InputDecoration(
                      labelText: 'Target date (optional)'),
                  child: Text(
                    _targetDate == null
                        ? 'No target date'
                        : Dates.medium(_targetDate!),
                  ),
                ),
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
                    : const Text('Create goal'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
