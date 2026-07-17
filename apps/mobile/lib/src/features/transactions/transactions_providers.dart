import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/providers.dart';
import '../../models/enums.dart';
import '../../models/paginated.dart';
import '../../models/transaction.dart';

/// Data gateway for the `/transactions` endpoints.
class TransactionsRepository {
  const TransactionsRepository(this._api);
  final ApiClient _api;

  Future<Paginated<Transaction>> list({
    int page = 1,
    int pageSize = 50,
    String? search,
    FlowType? type,
  }) async {
    final json = await _api.getJson('/transactions', query: {
      'page': page,
      'pageSize': pageSize,
      if (search != null) 'search': search,
      if (type != null) 'type': type.wire,
    });
    return Paginated.fromJson(json, (m) => Transaction.fromJson(m));
  }

  Future<Transaction> create(Map<String, dynamic> body) async =>
      Transaction.fromJson(await _api.post('/transactions', body: body));

  Future<void> delete(String id) => _api.delete('/transactions/$id');
}

final transactionsRepositoryProvider = Provider<TransactionsRepository>(
  (ref) => TransactionsRepository(ref.watch(apiClientProvider)),
);

/// The first page of the user's transactions.
final transactionsProvider = FutureProvider<Paginated<Transaction>>(
  (ref) => ref.watch(transactionsRepositoryProvider).list(),
);
