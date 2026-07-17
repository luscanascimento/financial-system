import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/providers.dart';
import '../../models/category.dart';
import '../../models/enums.dart';

/// Data gateway for the `/categories` endpoints.
class CategoriesRepository {
  const CategoriesRepository(this._api);
  final ApiClient _api;

  Future<List<Category>> list({FlowType? type}) async {
    final data = await _api.getList('/categories', query: {
      if (type != null) 'type': type.wire,
    });
    return data
        .map((e) => Category.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Category> create(Map<String, dynamic> body) async =>
      Category.fromJson(await _api.post('/categories', body: body));

  Future<Category> update(String id, Map<String, dynamic> body) async =>
      Category.fromJson(await _api.patch('/categories/$id', body: body));

  Future<void> archive(String id) => _api.delete('/categories/$id');
}

final categoriesRepositoryProvider = Provider<CategoriesRepository>(
  (ref) => CategoriesRepository(ref.watch(apiClientProvider)),
);

/// All active categories for the current user.
final categoriesProvider = FutureProvider<List<Category>>(
  (ref) => ref.watch(categoriesRepositoryProvider).list(),
);
