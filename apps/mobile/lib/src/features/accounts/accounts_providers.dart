import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/providers.dart';
import '../../models/account.dart';

/// Data gateway for the `/accounts` endpoints.
class AccountsRepository {
  const AccountsRepository(this._api);
  final ApiClient _api;

  Future<List<Account>> list({bool includeArchived = false}) async {
    final data = await _api.getList('/accounts', query: {
      'includeArchived': includeArchived,
    });
    return data
        .map((e) => Account.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Account> create(Map<String, dynamic> body) async =>
      Account.fromJson(await _api.post('/accounts', body: body));

  Future<Account> update(String id, Map<String, dynamic> body) async =>
      Account.fromJson(await _api.patch('/accounts/$id', body: body));

  Future<void> archive(String id) => _api.delete('/accounts/$id');
}

final accountsRepositoryProvider = Provider<AccountsRepository>(
  (ref) => AccountsRepository(ref.watch(apiClientProvider)),
);

/// All active accounts for the current user.
final accountsProvider = FutureProvider<List<Account>>(
  (ref) => ref.watch(accountsRepositoryProvider).list(),
);
