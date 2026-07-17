import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_exception.dart';
import '../../core/widgets/async_view.dart';
import '../../models/category.dart';
import '../../models/enums.dart';
import 'categories_providers.dart';

/// Lists the user's categories in two sections — Income and Expense — and lets
/// them create categories or archive their own, mirroring the web Categories
/// screen.
class CategoriesScreen extends ConsumerWidget {
  const CategoriesScreen({super.key});

  static String _label(FlowType type) => switch (type) {
        FlowType.income => 'Income',
        FlowType.expense => 'Expense',
      };

  /// Parses a `#RRGGBB`/`RRGGBB` hex string into a [Color]; null when absent or
  /// malformed, so the tile falls back to the theme colour.
  static Color? _parseColor(String? hex) {
    if (hex == null) return null;
    var value = hex.trim();
    if (value.startsWith('#')) value = value.substring(1);
    if (value.length == 6) value = 'FF$value';
    if (value.length != 8) return null;
    final parsed = int.tryParse(value, radix: 16);
    return parsed == null ? null : Color(parsed);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categories = ref.watch(categoriesProvider);
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('New category'),
      ),
      body: AsyncView<List<Category>>(
        value: categories,
        onRetry: () => ref.invalidate(categoriesProvider),
        data: (items) {
          if (items.isEmpty) {
            return EmptyState(
              icon: Icons.category_outlined,
              title: 'No categories yet',
              subtitle: 'Add a category to classify your income and spending.',
              action: FilledButton.icon(
                onPressed: () => _openForm(context, ref),
                icon: const Icon(Icons.add),
                label: const Text('New category'),
              ),
            );
          }
          final income =
              items.where((c) => c.type == FlowType.income).toList();
          final expense =
              items.where((c) => c.type == FlowType.expense).toList();
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(categoriesProvider),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              children: [
                _Section(
                  title: _label(FlowType.income),
                  categories: income,
                  onArchive: (c) => _confirmArchive(context, ref, c),
                ),
                const SizedBox(height: 8),
                _Section(
                  title: _label(FlowType.expense),
                  categories: expense,
                  onArchive: (c) => _confirmArchive(context, ref, c),
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
      builder: (_) => const _CategoryForm(),
    );
    if (saved == true) ref.invalidate(categoriesProvider);
  }

  Future<void> _confirmArchive(
    BuildContext context,
    WidgetRef ref,
    Category category,
  ) async {
    if (category.system) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Archive category?'),
        content: Text('“${category.name}” will be hidden from your categories.'),
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
      await ref.read(categoriesRepositoryProvider).archive(category.id);
      ref.invalidate(categoriesProvider);
    } on ApiException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }
}

/// A titled group of category tiles, with an empty hint when the group is bare.
class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.categories,
    required this.onArchive,
  });

  final String title;
  final List<Category> categories;
  final void Function(Category category) onArchive;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 8, 4, 8),
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        if (categories.isEmpty)
          Card(
            child: ListTile(
              title: Text(
                'No $title categories',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
              ),
            ),
          )
        else
          for (final category in categories)
            Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor:
                      CategoriesScreen._parseColor(category.color) ??
                          scheme.primaryContainer,
                  child: Icon(
                    Icons.label_outline,
                    size: 18,
                    color: scheme.onPrimaryContainer,
                  ),
                ),
                title: Text(category.name),
                trailing: category.system
                    ? const Chip(
                        label: Text('system'),
                        visualDensity: VisualDensity.compact,
                      )
                    : null,
                onLongPress:
                    category.system ? null : () => onArchive(category),
              ),
            ),
      ],
    );
  }
}

/// Create form rendered in a bottom sheet.
class _CategoryForm extends ConsumerStatefulWidget {
  const _CategoryForm();

  @override
  ConsumerState<_CategoryForm> createState() => _CategoryFormState();
}

class _CategoryFormState extends ConsumerState<_CategoryForm> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _color = TextEditingController();
  FlowType _type = FlowType.expense;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _color.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    final repo = ref.read(categoriesRepositoryProvider);
    final color = _color.text.trim().isEmpty ? null : _color.text.trim();
    try {
      await repo.create({
        'name': _name.text.trim(),
        'type': _type.wire,
        if (color != null) 'color': color,
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
                'New category',
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
              DropdownButtonFormField<FlowType>(
                initialValue: _type,
                decoration: const InputDecoration(labelText: 'Type'),
                items: [
                  for (final t in FlowType.values)
                    DropdownMenuItem(
                      value: t,
                      child: Text(CategoriesScreen._label(t)),
                    ),
                ],
                onChanged: (t) => setState(() => _type = t ?? _type),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _color,
                decoration: const InputDecoration(
                  labelText: 'Color (optional)',
                  hintText: '#4F46E5',
                ),
                validator: (v) {
                  final value = v?.trim() ?? '';
                  if (value.isEmpty) return null;
                  return CategoriesScreen._parseColor(value) == null
                      ? 'Use a hex colour like #4F46E5'
                      : null;
                },
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
                    : const Text('Create category'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
