import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:ai_dashboard_frontend/config/app_theme.dart';

/// Floating coffee beans animation for festive effect
class FestiveConfetti extends StatefulWidget {
  final Widget child;
  final bool enabled;

  const FestiveConfetti({
    super.key,
    required this.child,
    this.enabled = true,
  });

  @override
  State<FestiveConfetti> createState() => _FestiveConfettiState();
}

class _FestiveConfettiState extends State<FestiveConfetti>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late List<_ConfettiParticle> _particles;
  final _random = math.Random();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    );

    _particles = List.generate(15, (_) => _generateParticle());

    if (widget.enabled) {
      _controller.repeat();
    }
  }

  _ConfettiParticle _generateParticle() {
    return _ConfettiParticle(
      x: _random.nextDouble(),
      startY: _random.nextDouble() * 0.3,
      size: 8 + _random.nextDouble() * 12,
      speed: 0.3 + _random.nextDouble() * 0.5,
      wobble: _random.nextDouble() * 2 * math.pi,
      wobbleSpeed: 1 + _random.nextDouble() * 2,
      rotation: _random.nextDouble() * 2 * math.pi,
      rotationSpeed: 0.5 + _random.nextDouble(),
      type: _random.nextInt(3), // 0: coffee bean, 1: star, 2: circle
      color: [
        AppColors.primary,
        AppColors.gold,
        AppColors.caramel,
        const Color(0xFFD4A574),
      ][_random.nextInt(4)],
    );
  }

  @override
  void didUpdateWidget(FestiveConfetti oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.enabled && !oldWidget.enabled) {
      _controller.repeat();
    } else if (!widget.enabled && oldWidget.enabled) {
      _controller.stop();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled) return widget.child;

    return Stack(
      children: [
        widget.child,
        Positioned.fill(
          child: IgnorePointer(
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, _) {
                return CustomPaint(
                  painter: _ConfettiPainter(
                    particles: _particles,
                    progress: _controller.value,
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _ConfettiParticle {
  final double x;
  final double startY;
  final double size;
  final double speed;
  final double wobble;
  final double wobbleSpeed;
  final double rotation;
  final double rotationSpeed;
  final int type;
  final Color color;

  _ConfettiParticle({
    required this.x,
    required this.startY,
    required this.size,
    required this.speed,
    required this.wobble,
    required this.wobbleSpeed,
    required this.rotation,
    required this.rotationSpeed,
    required this.type,
    required this.color,
  });
}

class _ConfettiPainter extends CustomPainter {
  final List<_ConfettiParticle> particles;
  final double progress;

  _ConfettiPainter({
    required this.particles,
    required this.progress,
  });

  @override
  void paint(Canvas canvas, Size size) {
    for (final particle in particles) {
      final yProgress = (progress * particle.speed + particle.startY) % 1.2;
      if (yProgress > 1.1) continue;

      final x = particle.x * size.width +
          math.sin(progress * particle.wobbleSpeed * 2 * math.pi + particle.wobble) * 30;
      final y = yProgress * size.height;

      final opacity = yProgress < 0.1
          ? yProgress / 0.1
          : yProgress > 0.9
              ? (1 - yProgress) / 0.1
              : 1.0;

      final paint = Paint()
        ..color = particle.color.withValues(alpha: 0.4 * opacity)
        ..style = PaintingStyle.fill;

      canvas.save();
      canvas.translate(x, y);
      canvas.rotate(progress * particle.rotationSpeed * 2 * math.pi + particle.rotation);

      switch (particle.type) {
        case 0: // Coffee bean shape
          _drawCoffeeBean(canvas, particle.size, paint);
          break;
        case 1: // Star
          _drawStar(canvas, particle.size, paint);
          break;
        default: // Circle
          canvas.drawCircle(Offset.zero, particle.size / 2, paint);
      }

      canvas.restore();
    }
  }

  void _drawCoffeeBean(Canvas canvas, double size, Paint paint) {
    final path = Path();
    path.addOval(Rect.fromCenter(
      center: Offset.zero,
      width: size,
      height: size * 0.6,
    ));
    canvas.drawPath(path, paint);

    // Center line
    final linePaint = Paint()
      ..color = paint.color.withValues(alpha: (paint.color.a * 0.5))
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;
    canvas.drawLine(
      Offset(-size * 0.3, 0),
      Offset(size * 0.3, 0),
      linePaint,
    );
  }

  void _drawStar(Canvas canvas, double size, Paint paint) {
    final path = Path();
    const points = 5;
    final outerRadius = size / 2;
    final innerRadius = size / 4;

    for (int i = 0; i < points * 2; i++) {
      final radius = i.isEven ? outerRadius : innerRadius;
      final angle = (i * math.pi / points) - math.pi / 2;
      final x = math.cos(angle) * radius;
      final y = math.sin(angle) * radius;

      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _ConfettiPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

/// Celebration burst animation (for add to cart, etc.)
class CelebrationBurst extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final bool celebrate;

  const CelebrationBurst({
    super.key,
    required this.child,
    this.onTap,
    this.celebrate = false,
  });

  @override
  State<CelebrationBurst> createState() => _CelebrationBurstState();
}

class _CelebrationBurstState extends State<CelebrationBurst>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scale;
  late Animation<double> _burst;
  bool _showBurst = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _scale = TweenSequence([
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.9), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 0.9, end: 1.1), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 1.1, end: 1.0), weight: 1),
    ]).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));

    _burst = Tween(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        setState(() => _showBurst = false);
      }
    });
  }

  @override
  void didUpdateWidget(CelebrationBurst oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.celebrate && !oldWidget.celebrate) {
      _triggerCelebration();
    }
  }

  void _triggerCelebration() {
    setState(() => _showBurst = true);
    _controller.forward(from: 0);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        _triggerCelebration();
        widget.onTap?.call();
      },
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Stack(
            clipBehavior: Clip.none,
            children: [
              if (_showBurst) ..._buildBurstParticles(),
              Transform.scale(
                scale: _scale.value,
                child: child,
              ),
            ],
          );
        },
        child: widget.child,
      ),
    );
  }

  List<Widget> _buildBurstParticles() {
    final particles = <Widget>[];
    const particleCount = 8;
    final random = math.Random(42);

    for (int i = 0; i < particleCount; i++) {
      final angle = (i / particleCount) * 2 * math.pi;
      final distance = 30 + random.nextDouble() * 20;
      final size = 4 + random.nextDouble() * 4;

      particles.add(
        Positioned(
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          child: Center(
            child: Transform.translate(
              offset: Offset(
                math.cos(angle) * distance * _burst.value,
                math.sin(angle) * distance * _burst.value,
              ),
              child: Opacity(
                opacity: 1 - _burst.value,
                child: Container(
                  width: size,
                  height: size,
                  decoration: BoxDecoration(
                    color: [
                      AppColors.primary,
                      AppColors.gold,
                      AppColors.caramel,
                    ][i % 3],
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    return particles;
  }
}

/// Shimmer highlight effect for featured items
class ShimmerHighlight extends StatefulWidget {
  final Widget child;
  final bool enabled;

  const ShimmerHighlight({
    super.key,
    required this.child,
    this.enabled = true,
  });

  @override
  State<ShimmerHighlight> createState() => _ShimmerHighlightState();
}

class _ShimmerHighlightState extends State<ShimmerHighlight>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    );

    if (widget.enabled) {
      _controller.repeat();
    }
  }

  @override
  void didUpdateWidget(ShimmerHighlight oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.enabled && !oldWidget.enabled) {
      _controller.repeat();
    } else if (!widget.enabled && oldWidget.enabled) {
      _controller.stop();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled) return widget.child;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ShaderMask(
          shaderCallback: (bounds) {
            return LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: const [
                Colors.transparent,
                Colors.white24,
                Colors.transparent,
              ],
              stops: [
                _controller.value - 0.3,
                _controller.value,
                _controller.value + 0.3,
              ].map((e) => e.clamp(0.0, 1.0)).toList(),
            ).createShader(bounds);
          },
          blendMode: BlendMode.srcATop,
          child: child,
        );
      },
      child: widget.child,
    );
  }
}
