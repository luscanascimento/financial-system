import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/providers.dart';
import '../../models/budget.dart';

/// Data gateway for the `/budgets` endpoints.
class BudgetsRepository {
  const BudgetsRepository(this._api);
  final ApiClient _api;

  Future<List<BudgetProgress>> list() async {
    final data = await _api.getList('/budgets');
    return data
        .map((e) => BudgetProgress.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Budget> create(Map<String, dynamic> body) async =>
      Budget.fromJson(await _api.post('/budgets', body: body));

  Future<void> delete(String id) => _api.delete('/budgets/$id');
}

final budgetsRepositoryProvider = Provider<BudgetsRepository>(
  (ref) => BudgetsRepository(ref.watch(apiClientProvider)),
);

/// All budgets for the current user, enriched with this period's spend.
final budgetsProvider = FutureProvider<List<BudgetProgress>>(
  (ref) => ref.watch(budgetsRepositoryProvider).list(),
);
