import 'package:flutter/material.dart';
import 'package:ai_dashboard_frontend/config/app_theme.dart';
import 'dart:math' as math;

/// A beautiful branded loader widget for the app
class AppLoader extends StatefulWidget {
  final double size;
  final Color? color;

  const AppLoader({
    super.key,
    this.size = 60,
    this.color,
  });

  @override
  State<AppLoader> createState() => _AppLoaderState();
}

class _AppLoaderState extends State<AppLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.color ?? AppColors.primary;

    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return CustomPaint(
            painter: _LoaderPainter(
              progress: _controller.value,
              color: color,
            ),
          );
        },
      ),
    );
  }
}

class _LoaderPainter extends CustomPainter {
  final double progress;
  final Color color;

  _LoaderPainter({
    required this.progress,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 4;

    // Draw background circle
    final bgPaint = Paint()
      ..color = color.withValues(alpha: 0.15)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, bgPaint);

    // Draw animated arc
    final arcPaint = Paint()
      ..shader = SweepGradient(
        startAngle: 0,
        endAngle: math.pi * 2,
        colors: [
          color.withValues(alpha: 0.1),
          color,
        ],
        transform: GradientRotation(progress * math.pi * 2),
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2 + progress * math.pi * 2,
      math.pi * 1.5,
      false,
      arcPaint,
    );

    // Draw dots
    for (int i = 0; i < 3; i++) {
      final angle = (progress * math.pi * 2) + (i * math.pi * 2 / 3);
      final dotRadius = 3.0 + (math.sin(progress * math.pi * 2 + i) * 1.5);
      final dotCenter = Offset(
        center.dx + (radius * 0.5) * math.cos(angle),
        center.dy + (radius * 0.5) * math.sin(angle),
      );

      final dotPaint = Paint()
        ..color = color.withValues(alpha: 0.6 + (math.sin(progress * math.pi * 2 + i) * 0.4))
        ..style = PaintingStyle.fill;

      canvas.drawCircle(dotCenter, dotRadius, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _LoaderPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

/// A full-screen loading overlay
class LoadingOverlayWidget extends StatelessWidget {
  final String? message;

  const LoadingOverlayWidget({
    super.key,
    this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black.withValues(alpha: 0.5),
      child: Center(
        child: Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.2),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const AppLoader(size: 70),
              if (message != null) ...[
                const SizedBox(height: 20),
                Text(
                  message!,
                  style: TextStyle(
                    fontSize: 15,
                    color: Colors.grey[700],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// A simple inline loader for smaller spaces
class InlineLoader extends StatefulWidget {
  final double size;
  final Color? color;

  const InlineLoader({
    super.key,
    this.size = 24,
    this.color,
  });

  @override
  State<InlineLoader> createState() => _InlineLoaderState();
}

class _InlineLoaderState extends State<InlineLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.color ?? AppColors.primary;

    return SizedBox(
      width: widget.size * 2.5,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(3, (index) {
              final delay = index * 0.2;
              final value = ((_controller.value + delay) % 1.0);
              final scale = 0.5 + (math.sin(value * math.pi) * 0.5);
              final opacity = 0.3 + (math.sin(value * math.pi) * 0.7);

              return Container(
                margin: EdgeInsets.symmetric(horizontal: widget.size * 0.1),
                child: Transform.scale(
                  scale: scale,
                  child: Container(
                    width: widget.size * 0.35,
                    height: widget.size * 0.35,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: opacity),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              );
            }),
          );
        },
      ),
    );
  }
}
