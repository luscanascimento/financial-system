import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/auth_controller.dart';
import '../theme/theme_controller.dart';

/// A primary navigation destination.
class NavDestination {
  const NavDestination(this.label, this.path, this.icon);
  final String label;
  final String path;
  final IconData icon;
}

const navDestinations = <NavDestination>[
  NavDestination('Dashboard', '/dashboard', Icons.dashboard_outlined),
  NavDestination('Accounts', '/accounts', Icons.account_balance_outlined),
  NavDestination('Transactions', '/transactions', Icons.receipt_long_outlined),
  NavDestination('Budgets', '/budgets', Icons.savings_outlined),
  NavDestination('Goals', '/goals', Icons.flag_outlined),
  NavDestination('Categories', '/categories', Icons.category_outlined),
];

/// Authenticated app chrome: a navigation drawer of primary destinations plus a
/// top bar carrying the section title, theme toggle and account menu — mirroring
/// the web app's sidenav shell. Wraps the routed [child].
class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  int _selectedIndex(String location) {
    final index =
        navDestinations.indexWhere((d) => location.startsWith(d.path));
    return index < 0 ? 0 : index;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;
    final selected = _selectedIndex(location);
    final user = ref.watch(authControllerProvider).user;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(navDestinations[selected].label),
        actions: [
          IconButton(
            tooltip: isDark ? 'Switch to light mode' : 'Switch to dark mode',
            icon: Icon(isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined),
            onPressed: () => ref
                .read(themeControllerProvider.notifier)
                .toggle(Theme.of(context).brightness),
          ),
          PopupMenuButton<String>(
            tooltip: 'Account',
            icon: CircleAvatar(
              radius: 15,
              child: Text(
                user?.initials ?? '?',
                style: const TextStyle(fontSize: 12),
              ),
            ),
            itemBuilder: (context) => [
              PopupMenuItem<String>(
                enabled: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(user?.displayName ?? '',
                        style: Theme.of(context).textTheme.titleSmall),
                    Text(user?.email ?? '',
                        style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem<String>(
                value: 'logout',
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.logout),
                  title: Text('Sign out'),
                ),
              ),
            ],
            onSelected: (value) {
              if (value == 'logout') ref.read(authControllerProvider.notifier).logout();
            },
          ),
        ],
      ),
      drawer: NavigationDrawer(
        selectedIndex: selected,
        onDestinationSelected: (index) {
          Navigator.of(context).pop();
          context.go(navDestinations[index].path);
        },
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(28, 20, 16, 12),
            child: Row(
              children: [
                Icon(Icons.account_balance_wallet,
                    color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 12),
                Text('FinanceHub',
                    style: Theme.of(context).textTheme.titleLarge),
              ],
            ),
          ),
          for (final d in navDestinations)
            NavigationDrawerDestination(
              icon: Icon(d.icon),
              label: Text(d.label),
            ),
        ],
      ),
      body: child,
    );
  }
}
