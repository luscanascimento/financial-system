import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format/dates.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/kpi_card.dart';
import '../../core/widgets/money_text.dart';
import '../../models/reports.dart';
import 'dashboard_providers.dart';

/// The financial home: headline KPIs, a cash-flow summary and an expense
/// breakdown — mirroring the web Dashboard.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overview = ref.watch(overviewProvider);
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(overviewProvider);
          ref.invalidate(cashFlowProvider);
          ref.invalidate(expenseBreakdownProvider);
        },
        child: AsyncView<FinancialOverview>(
          value: overview,
          onRetry: () => ref.invalidate(overviewProvider),
          data: (data) => ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              _KpiGrid(overview: data),
              const SizedBox(height: 16),
              _CashFlowCard(currency: data.currency),
              const SizedBox(height: 16),
              _ExpenseBreakdownCard(currency: data.currency),
            ],
          ),
        ),
      ),
    );
  }
}

/// A responsive grid of KPI cards driven by the overview snapshot.
class _KpiGrid extends StatelessWidget {
  const _KpiGrid({required this.overview});

  final FinancialOverview overview;

  @override
  Widget build(BuildContext context) {
    final currency = overview.currency;
    final cards = <Widget>[
      KpiCard(
        label: 'Total balance',
        icon: Icons.account_balance_wallet,
        value: MoneyText(overview.totalBalanceMinor, currency),
      ),
      KpiCard(
        label: 'Net worth',
        icon: Icons.savings,
        value: MoneyText(overview.netWorth.netWorthMinor, currency),
      ),
      KpiCard(
        label: 'This month income',
        icon: Icons.south_west,
        valueColor: AppTheme.positive(context),
        value: MoneyText(
          overview.monthIncomeMinor,
          currency,
          style: TextStyle(color: AppTheme.positive(context)),
        ),
      ),
      KpiCard(
        label: 'This month expense',
        icon: Icons.north_east,
        valueColor: AppTheme.negative(context),
        value: MoneyText(
          overview.monthExpenseMinor,
          currency,
          style: TextStyle(color: AppTheme.negative(context)),
        ),
      ),
      KpiCard(
        label: 'This month net',
        icon: Icons.trending_up,
        value: MoneyText(
          overview.monthNetMinor,
          currency,
          signed: true,
          colored: true,
        ),
      ),
      KpiCard(
        label: 'Accounts',
        icon: Icons.account_balance,
        value: Text('${overview.accountsCount}'),
      ),
      KpiCard(
        label: 'Transactions',
        icon: Icons.receipt_long,
        value: Text('${overview.transactionsCount}'),
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        const spacing = 12.0;
        final columns = constraints.maxWidth >= 520 ? 3 : 2;
        final width =
            (constraints.maxWidth - spacing * (columns - 1)) / columns;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final card in cards)
              SizedBox(width: width, child: card),
          ],
        );
      },
    );
  }
}

/// Cash-flow card: one row per period with income/expense bars and a net total.
class _CashFlowCard extends ConsumerWidget {
  const _CashFlowCard({required this.currency});

  final String currency;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final points = ref.watch(cashFlowProvider);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Cash flow',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            points.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => AppErrorView(
                message: error.toString(),
                onRetry: () => ref.invalidate(cashFlowProvider),
              ),
              data: (items) {
                if (items.isEmpty) {
                  return const EmptyState(
                    icon: Icons.show_chart,
                    title: 'No cash flow yet',
                    subtitle: 'Add some transactions to see your trend.',
                  );
                }
                final maxValue = items.fold<int>(
                  1,
                  (max, p) => [max, p.incomeMinor, p.expenseMinor]
                      .reduce((a, b) => a > b ? a : b),
                );
                return Column(
                  children: [
                    for (final point in items) ...[
                      _CashFlowRow(
                        point: point,
                        currency: currency,
                        maxValue: maxValue,
                      ),
                      if (point != items.last) const SizedBox(height: 16),
                    ],
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// A single period's income vs. expense bars plus its net total.
class _CashFlowRow extends StatelessWidget {
  const _CashFlowRow({
    required this.point,
    required this.currency,
    required this.maxValue,
  });

  final CashFlowPoint point;
  final String currency;
  final int maxValue;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              Dates.monthDay(point.period),
              style: theme.textTheme.labelLarge,
            ),
            MoneyText(
              point.netMinor,
              currency,
              signed: true,
              colored: true,
              style: theme.textTheme.labelLarge,
            ),
          ],
        ),
        const SizedBox(height: 6),
        _Bar(
          value: point.incomeMinor,
          maxValue: maxValue,
          color: AppTheme.positive(context),
        ),
        const SizedBox(height: 4),
        _Bar(
          value: point.expenseMinor,
          maxValue: maxValue,
          color: AppTheme.negative(context),
        ),
      ],
    );
  }
}

/// A proportional horizontal bar for a single value.
class _Bar extends StatelessWidget {
  const _Bar({
    required this.value,
    required this.maxValue,
    required this.color,
  });

  final int value;
  final int maxValue;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final fraction = maxValue <= 0 ? 0.0 : (value / maxValue).clamp(0.0, 1.0);
    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: LayoutBuilder(
        builder: (context, constraints) => Container(
          height: 8,
          color: color.withValues(alpha: 0.15),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Container(
              height: 8,
              width: constraints.maxWidth * fraction,
              color: color,
            ),
          ),
        ),
      ),
    );
  }
}

/// Expenses-by-category card: a row per category with a progress bar and amount.
class _ExpenseBreakdownCard extends ConsumerWidget {
  const _ExpenseBreakdownCard({required this.currency});

  final String currency;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final breakdown = ref.watch(expenseBreakdownProvider);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Expenses by category',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            breakdown.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => AppErrorView(
                message: error.toString(),
                onRetry: () => ref.invalidate(expenseBreakdownProvider),
              ),
              data: (items) {
                if (items.isEmpty) {
                  return const EmptyState(
                    icon: Icons.pie_chart_outline,
                    title: 'No expenses yet',
                    subtitle: 'Spending will be grouped by category here.',
                  );
                }
                return Column(
                  children: [
                    for (final item in items) ...[
                      _BreakdownRow(item: item, currency: currency),
                      if (item != items.last) const SizedBox(height: 14),
                    ],
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// A single category's name, share bar and amount.
class _BreakdownRow extends StatelessWidget {
  const _BreakdownRow({required this.item, required this.currency});

  final CategoryBreakdownItem item;
  final String currency;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                item.categoryName,
                style: theme.textTheme.bodyMedium,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 12),
            MoneyText(
              item.amountMinor,
              currency,
              style: theme.textTheme.bodyMedium,
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: item.ratio.clamp(0.0, 1.0),
            minHeight: 8,
            backgroundColor: theme.colorScheme.surfaceContainerHighest,
          ),
        ),
      ],
    );
  }
}
