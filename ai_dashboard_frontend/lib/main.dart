import 'package:ai_dashboard_frontend/services/user_session_service.dart';
import 'package:ai_dashboard_frontend/config/app_theme.dart';
import 'package:ai_dashboard_frontend/camera_preview_screen.dart';
import 'package:ai_dashboard_frontend/home_page.dart';
import 'package:flutter/material.dart';

// Legacy color aliases for backward compatibility
// Use AppColors from app_theme.dart for new code
const Color mcYellow = Color(0xFFB8860B); // Gold/Loyalty color
const Color mcRed = Color(0xFF8B4513); // Primary (Coffee brown)
const Color mcRedDark = Color(0xFF6D360F); // Primary hover
const Color mcRedLight = Color(0xFFA65E2E); // Primary light
const Color surfaceLight = Color(0xFFF8F7F6); // Background
const Color surfaceDark = Color(0xFF211811); // Dark background
const Color cardBackground = Color(0xFFFFFFFF); // Surface
const Color textPrimary = Color(0xFF1B130E); // Text primary
const Color textSecondary = Color(0xFF956D50); // Text secondary
const Color dividerColor = Color(0xFFE5E0DC); // Border

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await UserSessionService.init();

  // Set system UI overlay style for modern look
  AppTheme.setSystemUIOverlayStyle();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Go directly to home if logged in, otherwise camera preview
    final Widget home = UserSessionService.isLoggedIn
        ? HomePage(
            userName: UserSessionService.userName,
            profileId: UserSessionService.profileId,
            showWelcome: true,
          )
        : const CameraPreviewPage();

    return MaterialApp(
      title: 'Barista - Premium Coffee Shop',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      navigatorObservers: [cameraRouteObserver],
      home: home,
    );
  }
}