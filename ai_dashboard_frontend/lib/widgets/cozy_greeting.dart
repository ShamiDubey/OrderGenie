import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:ai_dashboard_frontend/config/app_theme.dart';

class CozyGreeting extends StatefulWidget {
  final String? userName;
  final VoidCallback onComplete;
  final Widget child;

  const CozyGreeting({
    super.key,
    this.userName,
    required this.onComplete,
    required this.child,
  });

  @override
  State<CozyGreeting> createState() => _CozyGreetingState();
}

class _CozyGreetingState extends State<CozyGreeting>
    with TickerProviderStateMixin {
  late AnimationController _mainController;
  late AnimationController _steamController;
  late AnimationController _collapseController;

  late Animation<double> _fadeIn;
  late Animation<double> _iconScale;
  late Animation<double> _textSlide;
  late Animation<double> _subtitleFade;
  late Animation<double> _collapse;

  bool _isCollapsing = false;
  bool _showContent = false;

  @override
  void initState() {
    super.initState();

    // Main entrance animation
    _mainController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    );

    // Steam animation (looping)
    _steamController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    );

    // Collapse animation
    _collapseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _setupAnimations();
    _startSequence();
  }

  void _setupAnimations() {
    _fadeIn = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.0, 0.3, curve: Curves.easeOut),
      ),
    );

    _iconScale = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.1, 0.5, curve: Curves.elasticOut),
      ),
    );

    _textSlide = Tween<double>(begin: 50.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.3, 0.6, curve: Curves.easeOutCubic),
      ),
    );

    _subtitleFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.5, 0.8, curve: Curves.easeOut),
      ),
    );

    _collapse = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _collapseController,
        curve: Curves.easeInOutCubic,
      ),
    );
  }

  Future<void> _startSequence() async {
    await Future.delayed(const Duration(milliseconds: 100));
    _mainController.forward();
    _steamController.repeat();

    // Auto-collapse after 2.5 seconds
    await Future.delayed(const Duration(milliseconds: 2500));
    _startCollapse();
  }

  void _startCollapse() {
    if (_isCollapsing) return;
    setState(() => _isCollapsing = true);

    _collapseController.forward().then((_) {
      setState(() => _showContent = true);
      widget.onComplete();
    });
  }

  @override
  void dispose() {
    _mainController.dispose();
    _steamController.dispose();
    _collapseController.dispose();
    super.dispose();
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  String _getCozyMessage() {
    final messages = [
      'Time for a warm cup',
      'Your cozy corner awaits',
      'Freshly brewed for you',
      'Warm vibes ahead',
    ];
    return messages[DateTime.now().second % messages.length];
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    if (_showContent) {
      return widget.child;
    }

    return Stack(
      children: [
        // Background content (faded)
        if (_isCollapsing)
          AnimatedBuilder(
            animation: _collapseController,
            builder: (context, child) {
              return Opacity(
                opacity: 1 - _collapse.value,
                child: widget.child,
              );
            },
          ),

        // Full screen greeting overlay
        AnimatedBuilder(
          animation: Listenable.merge([_mainController, _collapseController]),
          builder: (context, child) {
            final collapseValue = _isCollapsing ? _collapse.value : 1.0;

            return Positioned.fill(
              child: Opacity(
                opacity: _fadeIn.value * collapseValue,
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
                          const Color(0xFF4A2C17), // Deep coffee
                        ],
                        stops: const [0.0, 0.5, 1.0],
                      ),
                    ),
                    child: SafeArea(
                    child: GestureDetector(
                      onTap: _startCollapse,
                      behavior: HitTestBehavior.opaque,
                      child: Stack(
                        children: [
                          // Decorative coffee beans pattern
                          ..._buildCoffeeBeans(size, collapseValue),

                          // Main content
                          Center(
                            child: Transform.translate(
                              offset: Offset(0, -50 * (1 - collapseValue)),
                              child: Transform.scale(
                                scale: 0.8 + (0.2 * collapseValue),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    // Coffee cup with steam
                                    _buildCoffeeCup(collapseValue),

                                    SizedBox(height: 32 * collapseValue),

                                    // Greeting text
                                    Transform.translate(
                                      offset: Offset(0, _textSlide.value),
                                      child: Opacity(
                                        opacity: (1 - _textSlide.value / 50) * collapseValue,
                                        child: Text(
                                          _getGreeting(),
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w500,
                                            color: Colors.white.withValues(alpha: 0.8),
                                            letterSpacing: 2,
                                          ),
                                        ),
                                      ),
                                    ),

                                    SizedBox(height: 8 * collapseValue),

                                    // User name or welcome
                                    Transform.translate(
                                      offset: Offset(0, _textSlide.value * 0.8),
                                      child: Opacity(
                                        opacity: (1 - _textSlide.value / 50) * collapseValue,
                                        child: Text(
                                          widget.userName ?? 'Welcome',
                                          style: const TextStyle(
                                            fontSize: 36,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                            letterSpacing: -0.5,
                                          ),
                                        ),
                                      ),
                                    ),

                                    SizedBox(height: 16 * collapseValue),

                                    // Cozy message
                                    Opacity(
                                      opacity: _subtitleFade.value * collapseValue,
                                      child: Container(
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
                                            Icon(
                                              Icons.local_cafe_outlined,
                                              color: AppColors.caramel,
                                              size: 18,
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              _getCozyMessage(),
                                              style: TextStyle(
                                                fontSize: 14,
                                                color: Colors.white.withValues(alpha: 0.9),
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),

                                    SizedBox(height: 40 * collapseValue),

                                    // Tap to continue hint
                                    Opacity(
                                      opacity: _subtitleFade.value * collapseValue * 0.6,
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            Icons.touch_app_outlined,
                                            color: Colors.white.withValues(alpha: 0.5),
                                            size: 16,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            'Tap anywhere to continue',
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: Colors.white.withValues(alpha: 0.5),
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
                        ],
                      ),
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

  Widget _buildCoffeeCup(double collapseValue) {
    return AnimatedBuilder(
      animation: _steamController,
      builder: (context, child) {
        return Transform.scale(
          scale: _iconScale.value,
          child: SizedBox(
            width: 160,
            height: 180,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Steam particles
                ..._buildSteamParticles(collapseValue),

                // Coffee cup
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
                      Icons.coffee_rounded,
                      size: 56,
                      color: AppColors.primary,
                    ),
                  ),
                ),

                // Glow effect
                Container(
                  width: 140,
                  height: 140,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        AppColors.gold.withValues(alpha: 0.0),
                        AppColors.gold.withValues(alpha: 0.1 * _steamController.value),
                        AppColors.gold.withValues(alpha: 0.0),
                      ],
                      stops: const [0.0, 0.5, 1.0],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  List<Widget> _buildSteamParticles(double collapseValue) {
    final particles = <Widget>[];
    final steamCount = 5;

    for (int i = 0; i < steamCount; i++) {
      final delay = i * 0.15;
      final progress = (_steamController.value + delay) % 1.0;
      final opacity = math.sin(progress * math.pi) * 0.6 * collapseValue;
      final yOffset = -30 - (progress * 60);
      final xOffset = math.sin(progress * math.pi * 2 + i) * 15;

      particles.add(
        Positioned(
          top: 20 + yOffset,
          left: 70 + xOffset,
          child: Opacity(
            opacity: opacity.clamp(0.0, 1.0),
            child: Container(
              width: 8 + (i * 2),
              height: 8 + (i * 2),
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

  List<Widget> _buildCoffeeBeans(Size size, double collapseValue) {
    final beans = <Widget>[];
    final positions = [
      Offset(size.width * 0.1, size.height * 0.15),
      Offset(size.width * 0.85, size.height * 0.2),
      Offset(size.width * 0.15, size.height * 0.75),
      Offset(size.width * 0.9, size.height * 0.7),
      Offset(size.width * 0.5, size.height * 0.85),
    ];

    for (int i = 0; i < positions.length; i++) {
      beans.add(
        Positioned(
          left: positions[i].dx,
          top: positions[i].dy,
          child: Opacity(
            opacity: 0.15 * collapseValue,
            child: Transform.rotate(
              angle: i * 0.5,
              child: Icon(
                Icons.lens,
                size: 20 + (i * 5),
                color: Colors.white,
              ),
            ),
          ),
        ),
      );
    }

    return beans;
  }
}
