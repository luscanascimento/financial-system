/// Metadata describing a page of results.
class PaginationMeta {
  const PaginationMeta({
    required this.page,
    required this.pageSize,
    required this.totalItems,
    required this.totalPages,
    required this.hasPreviousPage,
    required this.hasNextPage,
  });

  final int page;
  final int pageSize;
  final int totalItems;
  final int totalPages;
  final bool hasPreviousPage;
  final bool hasNextPage;

  factory PaginationMeta.fromJson(Map<String, dynamic> json) => PaginationMeta(
        page: (json['page'] as num).toInt(),
        pageSize: (json['pageSize'] as num).toInt(),
        totalItems: (json['totalItems'] as num).toInt(),
        totalPages: (json['totalPages'] as num).toInt(),
        hasPreviousPage: json['hasPreviousPage'] as bool? ?? false,
        hasNextPage: json['hasNextPage'] as bool? ?? false,
      );
}

/// Envelope returned by every paginated endpoint.
class Paginated<T> {
  const Paginated({required this.items, required this.meta});

  final List<T> items;
  final PaginationMeta meta;

  factory Paginated.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) itemFromJson,
  ) =>
      Paginated(
        items: (json['items'] as List<dynamic>)
            .map((e) => itemFromJson(e as Map<String, dynamic>))
            .toList(),
        meta: PaginationMeta.fromJson(json['meta'] as Map<String, dynamic>),
      );
}
