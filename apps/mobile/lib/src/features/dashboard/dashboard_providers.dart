import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/providers.dart';
import '../../models/enums.dart';
import '../../models/reports.dart';

/// Data gateway for the `/reports` endpoints backing the dashboard.
class ReportsRepository {
  const ReportsRepository(this._api);
  final ApiClient _api;

  Future<FinancialOverview> overview() async =>
      FinancialOverview.fromJson(await _api.getJson('/reports/overview'));

  Future<List<CashFlowPoint>> cashFlow({int months = 6}) async {
    final data = await _api.getList('/reports/cash-flow', query: {
      'months': months,
    });
    return data
        .map((e) => CashFlowPoint.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<CategoryBreakdownItem>> categoryBreakdown({
    FlowType type = FlowType.expense,
  }) async {
    final data = await _api.getList('/reports/category-breakdown', query: {
      'type': type.wire,
    });
    return data
        .map((e) => CategoryBreakdownItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

final reportsRepositoryProvider = Provider<ReportsRepository>(
  (ref) => ReportsRepository(ref.watch(apiClientProvider)),
);

/// Headline KPIs for the current user.
final overviewProvider = FutureProvider<FinancialOverview>(
  (ref) => ref.watch(reportsRepositoryProvider).overview(),
);

/// Income vs. expense over the last six calendar buckets.
final cashFlowProvider = FutureProvider<List<CashFlowPoint>>(
  (ref) => ref.watch(reportsRepositoryProvider).cashFlow(months: 6),
);

/// This period's spend grouped by category.
final expenseBreakdownProvider = FutureProvider<List<CategoryBreakdownItem>>(
  (ref) => ref.watch(reportsRepositoryProvider).categoryBreakdown(),
);
