import 'dart:io';

import 'package:ai_dashboard_frontend/home_page.dart';
import 'package:ai_dashboard_frontend/registration_page.dart';
import 'package:ai_dashboard_frontend/admin/admin_page.dart';
import 'package:ai_dashboard_frontend/services/face_recognition_service.dart';
import 'package:ai_dashboard_frontend/services/user_session_service.dart';
import 'package:ai_dashboard_frontend/widgets/face_recognition_loader.dart';
import 'package:ai_dashboard_frontend/widgets/app_loader.dart';
import 'package:ai_dashboard_frontend/config/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';



// Global route observer for camera page to detect navigation
final RouteObserver<ModalRoute<void>> cameraRouteObserver = RouteObserver<ModalRoute<void>>();

class CameraPreviewPage extends StatefulWidget {
  const CameraPreviewPage({super.key});

  @override
  State<CameraPreviewPage> createState() => _CameraPreviewPageState();
}

class _CameraPreviewPageState extends State<CameraPreviewPage> with WidgetsBindingObserver, RouteAware {
  CameraController? _controller;
  List<CameraDescription> _availableCameras = [];
  final ImagePicker _imagePicker = ImagePicker();

  bool _isCameraInitialized = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeCamera();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Subscribe to route changes
    final route = ModalRoute.of(context);
    if (route != null) {
      cameraRouteObserver.subscribe(this, route);
    }
  }

  @override
  void didPopNext() {
    // Called when returning to this page from another page
    super.didPopNext();
    _reinitializeCameraIfNeeded();
  }

  @override
  void didPushNext() {
    // Called when navigating away from this page
    super.didPushNext();
    _pauseCamera();
  }

  void _pauseCamera() {
    if (_controller != null && _controller!.value.isInitialized) {
      _controller!.pausePreview();
    }
  }

  Future<void> _reinitializeCameraIfNeeded() async {
    if (!mounted) return;

    // Check if camera controller is still valid
    if (_controller == null || !_controller!.value.isInitialized) {
      setState(() => _isCameraInitialized = false);
      await _initializeCamera();
    } else {
      // Try to resume preview
      try {
        await _controller!.resumePreview();
        if (mounted) {
          setState(() => _isCameraInitialized = true);
        }
      } catch (e) {
        // If resume fails, reinitialize
        debugPrint('Failed to resume camera, reinitializing: $e');
        await _disposeCamera();
        await _initializeCamera();
      }
    }
  }

  Future<void> _disposeCamera() async {
    if (_controller != null) {
      try {
        await _controller!.dispose();
      } catch (e) {
        debugPrint('Error disposing camera: $e');
      }
      _controller = null;
    }
    if (mounted) {
      setState(() => _isCameraInitialized = false);
    }
  }

  Future<void> _initializeCamera() async {

  try {
    _availableCameras = await availableCameras();
  } catch (e) {
    // If the camera plugin fails to list cameras (e.g. no camera present),
    // set an empty list so the app can handle it gracefully.
    _availableCameras = <CameraDescription>[];
  }
    if (_availableCameras.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No camera available on this device')),
      );
      setState(() => _isCameraInitialized = false);
      return;
    }

    final front = _availableCameras.firstWhere(
      (c) => c.lensDirection == CameraLensDirection.front,
      orElse: () => _availableCameras.first,
    );
    _controller = CameraController(
      front,
      ResolutionPreset.high, // Higher resolution for better face recognition
      enableAudio: false,
      imageFormatGroup: Platform.isAndroid
          ? ImageFormatGroup.jpeg // JPEG for better quality
          : ImageFormatGroup.bgra8888,
    );
    try {
      await _controller!.initialize();

      // Set focus mode to auto for better clarity
      if (_controller!.value.focusPointSupported) {
        await _controller!.setFocusMode(FocusMode.auto);
      }

      // Set exposure mode to auto
      if (_controller!.value.exposurePointSupported) {
        await _controller!.setExposureMode(ExposureMode.auto);
      }

      if (!mounted) return;
      setState(() => _isCameraInitialized = true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Camera init error: $e')),
      );
    }
  }

  @override
  void dispose() {
    cameraRouteObserver.unsubscribe(this);
    WidgetsBinding.instance.removeObserver(this);
    _controller?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final CameraController? cameraController = _controller;

    if (cameraController == null || !cameraController.value.isInitialized) {
      return;
    }

    if (state == AppLifecycleState.inactive) {
      // Pause camera preview instead of disposing
      cameraController.pausePreview();
    } else if (state == AppLifecycleState.resumed) {
      // Resume preview if controller still exists, otherwise reinitialize
      if (_controller != null && _controller!.value.isInitialized) {
        _controller!.resumePreview();
      } else {
        _initializeCamera();
      }
    } else if (state == AppLifecycleState.paused) {
      // Only dispose when app is fully paused (going to background)
      setState(() => _isCameraInitialized = false);
      cameraController.dispose();
      _controller = null;
    }
  }

  void _showAdminLoginDialog() {
    final passwordController = TextEditingController();
    bool obscurePassword = true;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.indigo.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.admin_panel_settings, color: Colors.indigo),
              ),
              const SizedBox(width: 12),
              const Text('Admin Login'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Enter admin password to access the dashboard',
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: passwordController,
                obscureText: obscurePassword,
                decoration: InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  prefixIcon: const Icon(Icons.lock),
                  suffixIcon: IconButton(
                    icon: Icon(obscurePassword ? Icons.visibility : Icons.visibility_off),
                    onPressed: () => setDialogState(() => obscurePassword = !obscurePassword),
                  ),
                ),
                onSubmitted: (_) => _validateAndNavigate(passwordController.text),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => _validateAndNavigate(passwordController.text),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo),
              child: const Text('Login', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _validateAndNavigate(String password) {
    if (password == '123') {
      Navigator.pop(context); // Close dialog
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const AdminPage()),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Incorrect password'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _pickAndRecognizeImage() async {
    // Capture context references before async operations
    final navigator = Navigator.of(context);
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    try {
      final XFile? pickedFile = await _imagePicker.pickImage(
        source: ImageSource.gallery,
      );

      if (pickedFile == null) return;

      // Show loading overlay
      setState(() => _isLoading = true);

      // Call face recognition service
      final response = await FaceRecognitionService.recognizeFace(pickedFile);

      // Hide loading overlay
      if (mounted) setState(() => _isLoading = false);

      // Navigate based on success
      if (!mounted) return;
      if (response.success && response.data != null && response.data!.matches.isNotEmpty) {
        // Success: save session and show home page with matched name and profileId
        final match = response.data!.matches.first;
        await UserSessionService.saveUserSession(
          userName: match.name,
          profileId: match.profileId,
        );
        navigator.pushReplacement(
          MaterialPageRoute(
            builder: (_) => HomePage(
              userName: match.name,
              profileId: match.profileId,
              showWelcome: true,
            ),
          ),
        );
      } else {
        // Failure: redirect to registration page with image
        navigator.pushReplacement(
          MaterialPageRoute(
            builder: (_) => RegistrationPage(capturedImage: pickedFile),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        scaffoldMessenger.showSnackBar(
          SnackBar(content: Text('Upload failed: $e')),
        );
      }
    }
  }
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Barista'),
        actions: [
          TextButton.icon(
            onPressed: _showAdminLoginDialog,
            icon: Icon(Icons.admin_panel_settings, color: AppColors.textInverted.withValues(alpha: 0.8)),
            label: Text('Admin', style: TextStyle(color: AppColors.textInverted.withValues(alpha: 0.8))),
          ),
        ],
      ),
      body: FaceRecognitionLoader(
        isLoading: _isLoading,
        child: Column(
          children: [
            // Header text
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(
                    'Position your face in the frame',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'We\'ll recognize you instantly',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            // Camera Preview
            Expanded(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  color: AppColors.textPrimary,
                  boxShadow: AppShadows.lg,
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: _isCameraInitialized && _controller != null
                      ? AspectRatio(
                          aspectRatio: _controller!.value.aspectRatio,
                          child: CameraPreview(_controller!),
                        )
                      : const Center(child: AppLoader()),
                ),
              ),
            ),
            // Action Buttons
            Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Gallery Button
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.backgroundTertiary,
                      shape: BoxShape.circle,
                      boxShadow: AppShadows.md,
                    ),
                    child: IconButton(
                      onPressed: _pickAndRecognizeImage,
                      icon: const Icon(Icons.photo_library_outlined),
                      iconSize: 28,
                      color: AppColors.primary,
                      padding: const EdgeInsets.all(16),
                    ),
                  ),
                  const SizedBox(width: 24),
                  // Camera Capture Button
                  Container(
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      shape: BoxShape.circle,
                      boxShadow: AppShadows.primaryShadow,
                    ),
                    child: IconButton(
                      onPressed: _isCameraInitialized && _controller != null
                          ? () async {
                            // Capture context references before async operations
                            final navigator = Navigator.of(context);
                            final scaffoldMessenger = ScaffoldMessenger.of(context);

                            try {
                              // Show loading overlay
                              setState(() => _isLoading = true);
                              // Capture picture
                              final XFile picture = await _controller!.takePicture();

                              // Call face recognition service
                              final response = await FaceRecognitionService.recognizeFace(picture);

                              // Hide loading overlay
                              if (mounted) setState(() => _isLoading = false);

                              // Navigate based on success
                              if (!mounted) return;
                              if (response.success && response.data != null && response.data!.matches.isNotEmpty) {
                                // Success: save session and show home page with matched name and profileId
                                final match = response.data!.matches.first;
                                await UserSessionService.saveUserSession(
                                  userName: match.name,
                                  profileId: match.profileId,
                                );
                                navigator.pushReplacement(
                                  MaterialPageRoute(
                                    builder: (_) => HomePage(
                                      userName: match.name,
                                      profileId: match.profileId,
                                      showWelcome: true,
                                    ),
                                  ),
                                );
                              } else {
                                // Failure: redirect to registration page with image
                                navigator.push(
                                  MaterialPageRoute(
                                    builder: (_) => RegistrationPage(capturedImage: picture),
                                  ),
                                );
                              }
                            } catch (e) {
                              if (mounted) {
                                setState(() => _isLoading = false);
                                scaffoldMessenger.showSnackBar(
                                  SnackBar(content: Text('Recognition failed: $e')),
                                );
                              }
                            }
                          }
                        : null,
                      icon: const Icon(Icons.camera_alt_rounded),
                      iconSize: 32,
                      color: Colors.white,
                      padding: const EdgeInsets.all(20),
                    ),
                  ),
                  const SizedBox(width: 24),
                  // Info Button
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.backgroundTertiary,
                      shape: BoxShape.circle,
                      boxShadow: AppShadows.md,
                    ),
                    child: IconButton(
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: Row(
                              children: [
                                Icon(Icons.info_outline, color: AppColors.primary),
                                const SizedBox(width: 8),
                                const Text('How it works'),
                              ],
                            ),
                            content: const Text(
                              '1. Position your face in the camera frame\n'
                              '2. Tap the capture button\n'
                              '3. We\'ll recognize you and log you in\n\n'
                              'First time? You\'ll be taken to registration.',
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(ctx),
                                child: const Text('Got it'),
                              ),
                            ],
                          ),
                        );
                      },
                      icon: const Icon(Icons.help_outline),
                      iconSize: 28,
                      color: AppColors.primary,
                      padding: const EdgeInsets.all(16),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
