import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persisted light/dark/system theme preference (mirrors the web theme toggle).
class ThemeController extends StateNotifier<ThemeMode> {
  ThemeController() : super(ThemeMode.system) {
    _load();
  }

  static const _key = 'fh_theme_mode';
  final _storage = const FlutterSecureStorage();

  Future<void> _load() async {
    final saved = await _storage.read(key: _key);
    state = switch (saved) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
  }

  Future<void> toggle(Brightness current) async {
    final next = current == Brightness.dark ? ThemeMode.light : ThemeMode.dark;
    state = next;
    await _storage.write(key: _key, value: next.name);
  }
}

final themeControllerProvider =
    StateNotifierProvider<ThemeController, ThemeMode>(
  (ref) => ThemeController(),
);
