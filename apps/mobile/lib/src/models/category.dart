import 'enums.dart';

/// A user-defined classification for income or expense (one level of nesting).
class Category {
  const Category({
    required this.id,
    required this.name,
    required this.type,
    required this.parentId,
    required this.color,
    required this.icon,
    required this.system,
    required this.archived,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String name;
  final FlowType type;
  final String? parentId;
  final String? color;
  final String? icon;
  final bool system;
  final bool archived;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: json['id'] as String,
        name: json['name'] as String,
        type: FlowType.fromWire(json['type'] as String),
        parentId: json['parentId'] as String?,
        color: json['color'] as String?,
        icon: json['icon'] as String?,
        system: json['system'] as bool? ?? false,
        archived: json['archived'] as bool? ?? false,
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
      );
}

/// A category with its immediate children resolved (for tree views).
class CategoryNode extends Category {
  const CategoryNode({
    required super.id,
    required super.name,
    required super.type,
    required super.parentId,
    required super.color,
    required super.icon,
    required super.system,
    required super.archived,
    required super.createdAt,
    required super.updatedAt,
    required this.children,
  });

  final List<CategoryNode> children;

  factory CategoryNode.fromJson(Map<String, dynamic> json) {
    final base = Category.fromJson(json);
    final rawChildren = (json['children'] as List<dynamic>? ?? const [])
        .map((c) => CategoryNode.fromJson(c as Map<String, dynamic>))
        .toList();
    return CategoryNode(
      id: base.id,
      name: base.name,
      type: base.type,
      parentId: base.parentId,
      color: base.color,
      icon: base.icon,
      system: base.system,
      archived: base.archived,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      children: rawChildren,
    );
  }
}
