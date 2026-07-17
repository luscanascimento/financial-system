import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/providers.dart';
import '../../models/goal.dart';
import '../../models/paginated.dart';

/// Data gateway for the `/goals` endpoints.
class GoalsRepository {
  const GoalsRepository(this._api);
  final ApiClient _api;

  Future<List<Goal>> list() async {
    final json = await _api.getJson('/goals');
    final page = Paginated.fromJson(json, (m) => Goal.fromJson(m));
    return page.items;
  }

  Future<Goal> create(Map<String, dynamic> body) async =>
      Goal.fromJson(await _api.post('/goals', body: body));

  Future<void> delete(String id) => _api.delete('/goals/$id');

  Future<List<GoalContribution>> contributions(String goalId) async {
    final data = await _api.getList(
      '/goals/$goalId/contributions',
      query: {'limit': 100},
    );
    return data
        .map((e) => GoalContribution.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<GoalContribution> addContribution(
    String goalId,
    Map<String, dynamic> body,
  ) async =>
      GoalContribution.fromJson(
        await _api.post('/goals/$goalId/contributions', body: body),
      );
}

final goalsRepositoryProvider = Provider<GoalsRepository>(
  (ref) => GoalsRepository(ref.watch(apiClientProvider)),
);

/// All goals for the current user (first page of `/goals`).
final goalsProvider = FutureProvider<List<Goal>>(
  (ref) => ref.watch(goalsRepositoryProvider).list(),
);
