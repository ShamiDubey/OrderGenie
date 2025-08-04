import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:ai_dashboard_frontend/models/order.dart';
import 'package:ai_dashboard_frontend/config/app_theme.dart';

class OrderSuccessPage extends StatefulWidget {
  final Order order;

  const OrderSuccessPage({
    super.key,
    required this.order,
  });

  @override
  State<OrderSuccessPage> createState() => _OrderSuccessPageState();
}

class _OrderSuccessPageState extends State<OrderSuccessPage>
    with TickerProviderStateMixin {
  // Phase control
  bool _showCelebration = true;

  // Celebration animations
  late AnimationController _celebrationController;
  late AnimationController _checkController;
  late AnimationController _pointsController;
  late AnimationController _confettiController;

  // Details animations
  late AnimationController _detailsController;

  // Animation values
  late Animation<double> _checkScale;
  late Animation<double> _checkOpacity;
  late Animation<double> _textSlide;
  late Animation<double> _textOpacity;
  late Animation<double> _pointsValue;
  late Animation<double> _detailsFade;
  late Animation<Offset> _detailsSlide;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _startCelebrationSequence();
  }

  void _initializeAnimations() {
    // Celebration controller (main timeline)
    _celebrationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3500),
    );

    // Check mark animation
    _checkController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _checkScale = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _checkController, curve: Curves.elasticOut),
    );

    _checkOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _checkController, curve: Curves.easeIn),
    );

    // Text animations
    _textSlide = Tween<double>(begin: 30.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _celebrationController,
        curve: const Interval(0.2, 0.5, curve: Curves.easeOut),
      ),
    );

    _textOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _celebrationController,
        curve: const Interval(0.2, 0.4, curve: Curves.easeIn),
      ),
    );

    // Points counter animation
    _pointsController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _pointsValue = Tween<double>(
      begin: 0.0,
      end: widget.order.pointsEarned.toDouble(),
    ).animate(CurvedAnimation(
      parent: _pointsController,
      curve: Curves.easeOutCubic,
    ));

    // Confetti animation
    _confettiController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    );

    // Details view animations
    _detailsController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _detailsFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _detailsController, curve: Curves.easeIn),
    );

    _detailsSlide = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _detailsController,
      curve: Curves.easeOut,
    ));
  }

  void _startCelebrationSequence() async {
    // Start confetti immediately
    _confettiController.repeat();

    // Start check animation
    await Future.delayed(const Duration(milliseconds: 200));
    _checkController.forward();

    // Start main celebration timeline
    _celebrationController.forward();

    // Start points counter after text appears
    await Future.delayed(const Duration(milliseconds: 800));
    _pointsController.forward();

    // Transition to details after celebration
    await Future.delayed(const Duration(milliseconds: 2500));
    if (mounted) {
      setState(() => _showCelebration = false);
      _confettiController.stop();
      _detailsController.forward();
    }
  }

  @override
  void dispose() {
    _celebrationController.dispose();
    _checkController.dispose();
    _pointsController.dispose();
    _confettiController.dispose();
    _detailsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Main content
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 500),
            child: _showCelebration
                ? _buildCelebrationView()
                : _buildDetailsView(),
          ),

          // Confetti overlay
          if (_showCelebration)
            Positioned.fill(
              child: IgnorePointer(
                child: AnimatedBuilder(
                  animation: _confettiController,
                  builder: (context, _) {
                    return CustomPaint(
                      painter: _CelebrationConfettiPainter(
                        progress: _confettiController.value,
                      ),
                    );
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCelebrationView() {
    return Container(
      key: const ValueKey('celebration'),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppColors.primary.withValues(alpha: 0.1),
            AppColors.background,
          ],
        ),
      ),
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Animated checkmark with coffee theme
                AnimatedBuilder(
                  animation: _checkController,
                  builder: (context, child) {
                    return Transform.scale(
                      scale: _checkScale.value,
                      child: Opacity(
                        opacity: _checkOpacity.value,
                        child: Container(
                          width: 140,
                          height: 140,
                          decoration: BoxDecoration(
                            gradient: AppColors.primaryGradient,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.4),
                                blurRadius: 30,
                                spreadRadius: 5,
                              ),
                            ],
                          ),
                          child: const Stack(
                            alignment: Alignment.center,
                            children: [
                              Icon(
                                Icons.check_rounded,
                                color: Colors.white,
                                size: 70,
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 40),

                // Success text with slide animation
                AnimatedBuilder(
                  animation: _celebrationController,
                  builder: (context, child) {
                    return Transform.translate(
                      offset: Offset(0, _textSlide.value),
                      child: Opacity(
                        opacity: _textOpacity.value,
                        child: Column(
                          children: [
                            const Text(
                              'Order Placed! 🎉',
                              style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Thank you, ${widget.order.customerName}!',
                              style: TextStyle(
                                fontSize: 18,
                                color: AppColors.textSecondary,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                'Order #${widget.order.orderNumber}',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 40),

                // Animated loyalty points
                if (widget.order.pointsEarned > 0)
                  AnimatedBuilder(
                    animation: _pointsController,
                    builder: (context, child) {
                      return AnimatedOpacity(
                        opacity: _pointsController.value > 0 ? 1 : 0,
                        duration: const Duration(milliseconds: 300),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 16,
                          ),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                AppColors.gold.withValues(alpha: 0.2),
                                AppColors.gold.withValues(alpha: 0.1),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: AppColors.gold.withValues(alpha: 0.3),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppColors.gold,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.stars_rounded,
                                  color: Colors.white,
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '+${_pointsValue.value.toInt()}',
                                    style: TextStyle(
                                      fontSize: 28,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.gold,
                                    ),
                                  ),
                                  Text(
                                    'Loyalty Points Earned!',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDetailsView() {
    return SlideTransition(
      position: _detailsSlide,
      child: FadeTransition(
        opacity: _detailsFade,
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                // Compact header
                _buildCompactHeader(),
                const SizedBox(height: 20),

                // Order summary card
                _buildOrderSummaryCard(),
                const SizedBox(height: 16),

                // Order items card
                _buildOrderItemsCard(),
                const SizedBox(height: 16),

                // Order status timeline
                _buildStatusTimeline(),
                const SizedBox(height: 24),

                // Action buttons
                _buildActionButtons(),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCompactHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppShadows.primaryShadow,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.check_rounded,
              color: Colors.white,
              size: 28,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Order Confirmed!',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '#${widget.order.orderNumber}',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white.withValues(alpha: 0.8),
                  ),
                ),
              ],
            ),
          ),
          if (widget.order.pointsEarned > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.gold,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.stars_rounded, color: Colors.white, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    '+${widget.order.pointsEarned}',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOrderSummaryCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppShadows.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.receipt_long_rounded, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              const Text(
                'Order Summary',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildSummaryRow('Subtotal', '₹${widget.order.subtotalValue.toStringAsFixed(2)}'),
          if (widget.order.discountTotalValue > 0) ...[
            const SizedBox(height: 8),
            _buildSummaryRow(
              'Discount',
              '-₹${widget.order.discountTotalValue.toStringAsFixed(2)}',
              valueColor: Colors.green,
            ),
          ],
          if (widget.order.taxAmountValue > 0) ...[
            const SizedBox(height: 8),
            _buildSummaryRow('Tax', '₹${widget.order.taxAmountValue.toStringAsFixed(2)}'),
          ],
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Divider(),
          ),
          _buildSummaryRow(
            'Grand Total',
            '₹${widget.order.grandTotalValue.toStringAsFixed(2)}',
            isBold: true,
            valueColor: AppColors.primary,
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isBold = false, Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isBold ? 16 : 14,
            color: isBold ? AppColors.textPrimary : AppColors.textSecondary,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isBold ? 18 : 14,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
            color: valueColor ?? AppColors.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildOrderItemsCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppShadows.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.restaurant_menu_rounded, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              Text(
                'Items (${widget.order.totalItems})',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...widget.order.items.asMap().entries.map((entry) {
            final index = entry.key;
            final item = entry.value;
            return TweenAnimationBuilder<double>(
              tween: Tween(begin: 0.0, end: 1.0),
              duration: Duration(milliseconds: 300 + (index * 100)),
              builder: (context, value, child) {
                return Transform.translate(
                  offset: Offset(20 * (1 - value), 0),
                  child: Opacity(
                    opacity: value,
                    child: child,
                  ),
                );
              },
              child: _buildOrderItem(item),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildOrderItem(OrderItem item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          // Veg/Non-veg indicator
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              border: Border.all(
                color: item.isVeg ? Colors.green : Colors.red,
                width: 1.5,
              ),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Icon(
              Icons.circle,
              size: 8,
              color: item.isVeg ? Colors.green : Colors.red,
            ),
          ),
          const SizedBox(width: 12),
          // Item details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '₹${item.effectivePriceValue.toStringAsFixed(2)} × ${item.quantity}',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          // Total
          Text(
            '₹${item.lineTotalValue.toStringAsFixed(2)}',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusTimeline() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppShadows.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.local_shipping_rounded, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              const Text(
                'Order Status',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _getStatusColor(widget.order.status).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _getStatusTitle(widget.order.status),
                  style: TextStyle(
                    fontSize: 12,
                    color: _getStatusColor(widget.order.status),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          _buildTimelineItem(
            'Order Received',
            'Your order has been received',
            _isStatusCompleted(widget.order.status, OrderStatus.pending),
            widget.order.status == OrderStatus.pending,
            Icons.receipt_rounded,
          ),
          _buildTimelineItem(
            'Confirmed',
            'Order confirmed and accepted',
            _isStatusCompleted(widget.order.status, OrderStatus.confirmed),
            widget.order.status == OrderStatus.confirmed,
            Icons.thumb_up_rounded,
          ),
          _buildTimelineItem(
            'Preparing',
            'Your food is being prepared',
            _isStatusCompleted(widget.order.status, OrderStatus.preparing),
            widget.order.status == OrderStatus.preparing,
            Icons.restaurant_rounded,
          ),
          _buildTimelineItem(
            'Ready for Pickup',
            'Your order is ready!',
            _isStatusCompleted(widget.order.status, OrderStatus.ready),
            widget.order.status == OrderStatus.ready,
            Icons.check_circle_rounded,
            isLast: true,
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineItem(
    String title,
    String subtitle,
    bool isCompleted,
    bool isActive,
    IconData icon, {
    bool isLast = false,
  }) {
    final color = isCompleted
        ? Colors.green
        : isActive
            ? AppColors.primary
            : Colors.grey[300]!;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
              child: Icon(
                isCompleted ? Icons.check : icon,
                color: Colors.white,
                size: 16,
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 40,
                color: isCompleted ? Colors.green : Colors.grey[300],
              ),
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Padding(
            padding: EdgeInsets.only(bottom: isLast ? 0 : 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: isCompleted || isActive
                        ? AppColors.textPrimary
                        : AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons() {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              Navigator.of(context).popUntil((route) => route.isFirst);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.home_rounded, size: 20),
                SizedBox(width: 8),
                Text(
                  'Back to Home',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _getStatusTitle(OrderStatus status) {
    switch (status) {
      case OrderStatus.pending:
        return 'Received';
      case OrderStatus.confirmed:
        return 'Confirmed';
      case OrderStatus.preparing:
        return 'Preparing';
      case OrderStatus.ready:
        return 'Ready';
      case OrderStatus.completed:
        return 'Completed';
      case OrderStatus.cancelled:
        return 'Cancelled';
    }
  }

  Color _getStatusColor(OrderStatus status) {
    switch (status) {
      case OrderStatus.pending:
        return Colors.orange;
      case OrderStatus.confirmed:
        return Colors.blue;
      case OrderStatus.preparing:
        return AppColors.primary;
      case OrderStatus.ready:
        return Colors.green;
      case OrderStatus.completed:
        return Colors.green;
      case OrderStatus.cancelled:
        return Colors.red;
    }
  }

  bool _isStatusCompleted(OrderStatus currentStatus, OrderStatus checkStatus) {
    final statusOrder = [
      OrderStatus.pending,
      OrderStatus.confirmed,
      OrderStatus.preparing,
      OrderStatus.ready,
      OrderStatus.completed,
    ];

    final currentIndex = statusOrder.indexOf(currentStatus);
    final checkIndex = statusOrder.indexOf(checkStatus);

    return currentIndex > checkIndex;
  }
}

// Custom confetti painter for celebration
class _CelebrationConfettiPainter extends CustomPainter {
  final double progress;

  _CelebrationConfettiPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final particleCount = 50;

    for (int i = 0; i < particleCount; i++) {
      final seed = i * 1000;
      final particleRandom = math.Random(seed);

      final startX = particleRandom.nextDouble() * size.width;
      final startY = -20.0 - (particleRandom.nextDouble() * 100);
      final speed = 0.5 + particleRandom.nextDouble() * 0.5;
      final wobbleAmount = 30 + particleRandom.nextDouble() * 30;
      final wobbleSpeed = 2 + particleRandom.nextDouble() * 2;

      final currentY = startY + (progress * speed * (size.height + 150));
      if (currentY > size.height + 20) continue;

      final wobble = math.sin(progress * wobbleSpeed * math.pi * 2 + i) * wobbleAmount;
      final currentX = startX + wobble;

      final particleSize = 6 + particleRandom.nextDouble() * 8;
      final type = particleRandom.nextInt(4);

      final colors = [
        AppColors.primary,
        AppColors.gold,
        const Color(0xFFE8D5C4),
        AppColors.caramel,
      ];

      final paint = Paint()
        ..color = colors[type].withValues(alpha: 0.8)
        ..style = PaintingStyle.fill;

      canvas.save();
      canvas.translate(currentX, currentY);
      canvas.rotate(progress * 4 + i.toDouble());

      switch (type) {
        case 0: // Circle
          canvas.drawCircle(Offset.zero, particleSize / 2, paint);
          break;
        case 1: // Star
          _drawStar(canvas, particleSize, paint);
          break;
        case 2: // Rectangle
          canvas.drawRRect(
            RRect.fromRectAndRadius(
              Rect.fromCenter(center: Offset.zero, width: particleSize, height: particleSize * 0.6),
              const Radius.circular(2),
            ),
            paint,
          );
          break;
        default: // Diamond
          final path = Path()
            ..moveTo(0, -particleSize / 2)
            ..lineTo(particleSize / 2, 0)
            ..lineTo(0, particleSize / 2)
            ..lineTo(-particleSize / 2, 0)
            ..close();
          canvas.drawPath(path, paint);
      }

      canvas.restore();
    }
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
  bool shouldRepaint(covariant _CelebrationConfettiPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
