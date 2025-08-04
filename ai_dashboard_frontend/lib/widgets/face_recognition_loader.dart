import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:ai_dashboard_frontend/config/app_theme.dart';

class FaceRecognitionLoader extends StatefulWidget {
  final bool isLoading;
  final VoidCallback? onComplete;
  final Widget child;

  const FaceRecognitionLoader({
    super.key,
    required this.isLoading,
    this.onComplete,
    required this.child,
  });

  @override
  State<FaceRecognitionLoader> createState() => _FaceRecognitionLoaderState();
}

class _FaceRecognitionLoaderState extends State<FaceRecognitionLoader>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _scanController;
  late AnimationController _fadeController;

  late Animation<double> _pulse;
  late Animation<double> _scan;
  late Animation<double> _fade;

  @override
  void initState() {
    super.initState();

    // Pulse animation for the face icon
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    // Scan line animation
    _scanController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    );

    // Fade animation for enter/exit
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _setupAnimations();

    if (widget.isLoading) {
      _startAnimations();
    }
  }

  void _setupAnimations() {
    _pulse = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(
        parent: _pulseController,
        curve: Curves.easeInOut,
      ),
    );

    _scan = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _scanController,
        curve: Curves.easeInOut,
      ),
    );

    _fade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _fadeController,
        curve: Curves.easeOut,
      ),
    );
  }

  void _startAnimations() {
    _fadeController.forward();
    _pulseController.repeat(reverse: true);
    _scanController.repeat();
  }

  void _stopAnimations() {
    _fadeController.reverse().then((_) {
      widget.onComplete?.call();
    });
  }

  @override
  void didUpdateWidget(FaceRecognitionLoader oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isLoading && !oldWidget.isLoading) {
      _startAnimations();
    } else if (!widget.isLoading && oldWidget.isLoading) {
      _stopAnimations();
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _scanController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  String _getLoadingMessage() {
    final messages = [
      'Scanning your face...',
      'Analyzing features...',
      'Matching profile...',
      'Almost there...',
    ];
    return messages[DateTime.now().second % messages.length];
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Stack(
      children: [
        // Background content
        widget.child,

        // Full screen loading overlay
        if (widget.isLoading || _fadeController.isAnimating)
          AnimatedBuilder(
            animation: Listenable.merge([_fadeController, _pulseController, _scanController]),
            builder: (context, child) {
              return Positioned.fill(
                child: Opacity(
                  opacity: _fade.value,
                  child: Material(
                    color: Colors.transparent,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            AppColors.primary,
                            AppColors.primaryHover,
                            const Color(0xFF4A2C17),
                          ],
                          stops: const [0.0, 0.5, 1.0],
                        ),
                      ),
                      child: SafeArea(
                        child: Stack(
                          children: [
                            // Decorative particles
                            ..._buildParticles(size),

                            // Main content
                            Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  // Face scanning animation
                                  _buildFaceScanner(),

                                  const SizedBox(height: 40),

                                  // Loading text
                                  Text(
                                    'Recognizing You',
                                    style: TextStyle(
                                      fontSize: 28,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                      letterSpacing: -0.5,
                                    ),
                                  ),

                                  const SizedBox(height: 12),

                                  // Status message
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 20,
                                      vertical: 10,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(30),
                                      border: Border.all(
                                        color: Colors.white.withValues(alpha: 0.2),
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        SizedBox(
                                          width: 16,
                                          height: 16,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            valueColor: AlwaysStoppedAnimation<Color>(
                                              AppColors.caramel,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Text(
                                          _getLoadingMessage(),
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: Colors.white.withValues(alpha: 0.9),
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),

                                  const SizedBox(height: 60),

                                  // Coffee icon hint
                                  Opacity(
                                    opacity: 0.6,
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons.coffee_rounded,
                                          color: Colors.white.withValues(alpha: 0.5),
                                          size: 16,
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          'Your coffee awaits',
                                          style: TextStyle(
                                            fontSize: 13,
                                            color: Colors.white.withValues(alpha: 0.5),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildFaceScanner() {
    return SizedBox(
      width: 180,
      height: 180,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Outer ring pulse
          Transform.scale(
            scale: _pulse.value,
            child: Container(
              width: 160,
              height: 160,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.2),
                  width: 2,
                ),
              ),
            ),
          ),

          // Middle ring
          Container(
            width: 140,
            height: 140,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.3),
                width: 1.5,
              ),
            ),
          ),

          // Inner circle with face icon
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.white,
                  Colors.white.withValues(alpha: 0.95),
                ],
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.3),
                  blurRadius: 30,
                  offset: const Offset(0, 15),
                  spreadRadius: -5,
                ),
                BoxShadow(
                  color: AppColors.gold.withValues(alpha: 0.3),
                  blurRadius: 40,
                  offset: const Offset(0, 10),
                  spreadRadius: -10,
                ),
              ],
            ),
            child: Center(
              child: Icon(
                Icons.face_rounded,
                size: 56,
                color: AppColors.primary,
              ),
            ),
          ),

          // Scanning line
          ClipOval(
            child: SizedBox(
              width: 120,
              height: 120,
              child: Stack(
                children: [
                  Positioned(
                    top: _scan.value * 120 - 3,
                    left: 0,
                    right: 0,
                    child: Container(
                      height: 6,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            Colors.transparent,
                            AppColors.gold.withValues(alpha: 0.8),
                            Colors.transparent,
                          ],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.gold.withValues(alpha: 0.5),
                            blurRadius: 10,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Corner brackets
          ..._buildCornerBrackets(),
        ],
      ),
    );
  }

  List<Widget> _buildCornerBrackets() {
    const bracketSize = 20.0;
    const offset = 65.0;
    final color = Colors.white.withValues(alpha: 0.6);
    const strokeWidth = 3.0;

    return [
      // Top-left
      Positioned(
        top: 90 - offset,
        left: 90 - offset,
        child: CustomPaint(
          size: const Size(bracketSize, bracketSize),
          painter: _BracketPainter(
            corner: _Corner.topLeft,
            color: color,
            strokeWidth: strokeWidth,
          ),
        ),
      ),
      // Top-right
      Positioned(
        top: 90 - offset,
        right: 90 - offset,
        child: CustomPaint(
          size: const Size(bracketSize, bracketSize),
          painter: _BracketPainter(
            corner: _Corner.topRight,
            color: color,
            strokeWidth: strokeWidth,
          ),
        ),
      ),
      // Bottom-left
      Positioned(
        bottom: 90 - offset,
        left: 90 - offset,
        child: CustomPaint(
          size: const Size(bracketSize, bracketSize),
          painter: _BracketPainter(
            corner: _Corner.bottomLeft,
            color: color,
            strokeWidth: strokeWidth,
          ),
        ),
      ),
      // Bottom-right
      Positioned(
        bottom: 90 - offset,
        right: 90 - offset,
        child: CustomPaint(
          size: const Size(bracketSize, bracketSize),
          painter: _BracketPainter(
            corner: _Corner.bottomRight,
            color: color,
            strokeWidth: strokeWidth,
          ),
        ),
      ),
    ];
  }

  List<Widget> _buildParticles(Size size) {
    final particles = <Widget>[];
    final positions = [
      Offset(size.width * 0.1, size.height * 0.2),
      Offset(size.width * 0.85, size.height * 0.15),
      Offset(size.width * 0.15, size.height * 0.7),
      Offset(size.width * 0.9, size.height * 0.65),
      Offset(size.width * 0.5, size.height * 0.85),
    ];

    for (int i = 0; i < positions.length; i++) {
      final progress = (_scanController.value + i * 0.2) % 1.0;
      final opacity = math.sin(progress * math.pi) * 0.3;

      particles.add(
        Positioned(
          left: positions[i].dx,
          top: positions[i].dy,
          child: Opacity(
            opacity: opacity.clamp(0.0, 1.0),
            child: Container(
              width: 8 + (i * 3),
              height: 8 + (i * 3),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.4),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.white.withValues(alpha: 0.2),
                    blurRadius: 8,
                    spreadRadius: 2,
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return particles;
  }
}

enum _Corner { topLeft, topRight, bottomLeft, bottomRight }

class _BracketPainter extends CustomPainter {
  final _Corner corner;
  final Color color;
  final double strokeWidth;

  _BracketPainter({
    required this.corner,
    required this.color,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path();

    switch (corner) {
      case _Corner.topLeft:
        path.moveTo(0, size.height);
        path.lineTo(0, 0);
        path.lineTo(size.width, 0);
        break;
      case _Corner.topRight:
        path.moveTo(0, 0);
        path.lineTo(size.width, 0);
        path.lineTo(size.width, size.height);
        break;
      case _Corner.bottomLeft:
        path.moveTo(0, 0);
        path.lineTo(0, size.height);
        path.lineTo(size.width, size.height);
        break;
      case _Corner.bottomRight:
        path.moveTo(0, size.height);
        path.lineTo(size.width, size.height);
        path.lineTo(size.width, 0);
        break;
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _BracketPainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.strokeWidth != strokeWidth;
  }
}
