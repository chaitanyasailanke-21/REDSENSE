import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';

import 'models/health_reading.dart';
import 'services/esp32_connectivity_service.dart';
import 'services/firebase_sync_service.dart';
import 'screens/dashboard_screen.dart';
import 'screens/connectivity_screen.dart';
import 'screens/charts_screen.dart';
import 'screens/history_screen.dart';
import 'screens/camera_capture_screen.dart';
import 'screens/auth_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint('Firebase initialization placeholder (configure google-services.json / GoogleService-Info.plist): $e');
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => Esp32ConnectivityService()..startSimulatedStream()),
        ChangeNotifierProvider(create: (_) => FirebaseSyncService()..loadInitialDummyData()),
      ],
      child: const EzeCheckApp(),
    ),
  );
}

class EzeCheckApp extends StatelessWidget {
  const EzeCheckApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Redsense — Developed by Chaitanya Sai',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0284C7),
          primary: const Color(0xFF0284C7),
          secondary: const Color(0xFF0D9488),
          surface: Colors.white,
        ),
        cardTheme: CardTheme(
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: Color(0xFFE2E8F0), width: 1),
          ),
        ),
      ),
      home: const AdaptiveNavigationShell(),
    );
  }
}

class AdaptiveNavigationShell extends StatefulWidget {
  const AdaptiveNavigationShell({super.key});

  @override
  State<AdaptiveNavigationShell> createState() => _AdaptiveNavigationShellState();
}

class _AdaptiveNavigationShellState extends State<AdaptiveNavigationShell> {
  int _selectedIndex = 0;

  static const List<Widget> _screens = [
    DashboardScreen(),
    ConnectivityScreen(),
    ChartsScreen(),
    HistoryScreen(),
    CameraCaptureScreen(),
    AuthScreen(),
  ];

  static const List<NavigationDestination> _destinations = [
    NavigationDestination(icon: Icon(Icons.monitor_heart_outlined), selectedIcon: Icon(Icons.monitor_heart), label: 'Dashboard'),
    NavigationDestination(icon: Icon(Icons.bluetooth_searching_outlined), selectedIcon: Icon(Icons.bluetooth_connected), label: 'Devices'),
    NavigationDestination(icon: Icon(Icons.stacked_line_chart_outlined), selectedIcon: Icon(Icons.stacked_line_chart), label: 'Charts'),
    NavigationDestination(icon: Icon(Icons.history_outlined), selectedIcon: Icon(Icons.history), label: 'History'),
    NavigationDestination(icon: Icon(Icons.camera_alt_outlined), selectedIcon: Icon(Icons.camera_alt), label: 'ESP32-CAM'),
    NavigationDestination(icon: Icon(Icons.verified_user_outlined), selectedIcon: Icon(Icons.verified_user), label: 'Account'),
  ];

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final bool isTabletOrDesktop = constraints.maxWidth >= 768;

        if (isTabletOrDesktop) {
          return Scaffold(
            body: Row(
              children: [
                NavigationRail(
                  extended: constraints.maxWidth >= 1024,
                  backgroundColor: Colors.white,
                  selectedIndex: _selectedIndex,
                  onDestinationSelected: (idx) => setState(() => _selectedIndex = idx),
                  leading: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0284C7),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.favorite, color: Colors.white, size: 20),
                        ),
                        if (constraints.maxWidth >= 1024) ...[
                          const SizedBox(width: 12),
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Redsense',
                                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                              ),
                              Text(
                                'By Chaitanya Sai',
                                style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  destinations: _destinations
                      .map((d) => NavigationRailDestination(
                            icon: d.icon,
                            selectedIcon: d.selectedIcon,
                            label: Text(d.label),
                          ))
                      .toList(),
                ),
                const VerticalDivider(width: 1, thickness: 1, color: Color(0xFFE2E8F0)),
                Expanded(child: _screens[_selectedIndex]),
              ],
            ),
          );
        }

        return Scaffold(
          body: SafeArea(child: _screens[_selectedIndex]),
          bottomNavigationBar: NavigationBar(
            backgroundColor: Colors.white,
            selectedIndex: _selectedIndex,
            onDestinationSelected: (idx) => setState(() => _selectedIndex = idx),
            destinations: _destinations,
          ),
        );
      },
    );
  }
}
