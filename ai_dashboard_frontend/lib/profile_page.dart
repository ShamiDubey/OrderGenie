import 'package:flutter/material.dart';
import 'package:ai_dashboard_frontend/services/user_session_service.dart';
import 'package:ai_dashboard_frontend/services/cart_service.dart';
import 'package:ai_dashboard_frontend/services/order_service.dart';
import 'package:ai_dashboard_frontend/models/order.dart';
import 'package:ai_dashboard_frontend/camera_preview_screen.dart';
import 'package:ai_dashboard_frontend/order_history_page.dart';
import 'package:ai_dashboard_frontend/utils/animations.dart';
import 'package:ai_dashboard_frontend/config/app_theme.dart';
import 'package:intl/intl.dart';

class ProfilePage extends StatefulWidget {
  final String? userName;
  final String? profileId;

  const ProfilePage({super.key, this.userName, this.profileId});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> with TickerProviderStateMixin {
  // Animation controllers
  late AnimationController _headerController;
  late AnimationController _cardsController;
  late AnimationController _ordersController;

  // Animations
  late Animation<double> _headerSlide;
  late Animation<double> _headerOpacity;
  late Animation<double> _loyaltyScale;
  late Animation<double> _actionsSlide;
  late Animation<double> _ordersSlide;

  @override
  void initState() {
    super.initState();
    orderStateManager.addListener(_onOrdersChanged);
    _loadOrders();
    _setupAnimations();
    _startAnimations();
  }

  void _setupAnimations() {
    // Header animation
    _headerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _headerSlide = Tween<double>(begin: -50, end: 0).animate(
      CurvedAnimation(parent: _headerController, curve: Curves.easeOutCubic),
    );
    _headerOpacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _headerController, curve: Curves.easeOut),
    );

    // Cards animation
    _cardsController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _loyaltyScale = Tween<double>(begin: 0.8, end: 1).animate(
      CurvedAnimation(
        parent: _cardsController,
        curve: const Interval(0, 0.6, curve: Curves.elasticOut),
      ),
    );
    _actionsSlide = Tween<double>(begin: 50, end: 0).animate(
      CurvedAnimation(
        parent: _cardsController,
        curve: const Interval(0.3, 1, curve: Curves.easeOutCubic),
      ),
    );

    // Orders animation
    _ordersController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _ordersSlide = Tween<double>(begin: 80, end: 0).animate(
      CurvedAnimation(parent: _ordersController, curve: Curves.easeOutCubic),
    );
  }

  Future<void> _startAnimations() async {
    await Future.delayed(const Duration(milliseconds: 100));
    _headerController.forward();
    await Future.delayed(const Duration(milliseconds: 200));
    _cardsController.forward();
    await Future.delayed(const Duration(milliseconds: 300));
    _ordersController.forward();
  }

  @override
  void dispose() {
    _headerController.dispose();
    _cardsController.dispose();
    _ordersController.dispose();
    orderStateManager.removeListener(_onOrdersChanged);
    super.dispose();
  }

  void _onOrdersChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _loadOrders() async {
    await orderStateManager.loadOrders(widget.profileId);
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              await UserSessionService.clearSession();
              cartService.clearCart();
              orderStateManager.clearOrders();
              if (mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  SlidePageRoute(
                    page: const CameraPreviewPage(),
                    direction: SlideDirection.left,
                  ),
                  (route) => false,
                );
              }
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // Custom App Bar with Profile Header
          SliverToBoxAdapter(
            child: AnimatedBuilder(
              animation: _headerController,
              builder: (context, child) {
                return Transform.translate(
                  offset: Offset(0, _headerSlide.value),
                  child: Opacity(
                    opacity: _headerOpacity.value,
                    child: child,
                  ),
                );
              },
              child: _buildProfileHeader(),
            ),
          ),

          // Royalty Points Card
          SliverToBoxAdapter(
            child: AnimatedBuilder(
              animation: _cardsController,
              builder: (context, child) {
                return Transform.scale(
                  scale: _loyaltyScale.value,
                  child: Opacity(
                    opacity: _cardsController.value,
                    child: child,
                  ),
                );
              },
              child: Padding(
                padding: const EdgeInsets.only(top: 16),
                child: _buildRoyaltyPointsCard(),
              ),
            ),
          ),

          // Quick Actions
          SliverToBoxAdapter(
            child: AnimatedBuilder(
              animation: _cardsController,
              builder: (context, child) {
                return Transform.translate(
                  offset: Offset(0, _actionsSlide.value),
                  child: Opacity(
                    opacity: _cardsController.value,
                    child: child,
                  ),
                );
              },
              child: Padding(
                padding: const EdgeInsets.only(top: 16),
                child: _buildQuickActions(),
              ),
            ),
          ),

          // Order History Section
          SliverToBoxAdapter(
            child: AnimatedBuilder(
              animation: _ordersController,
              builder: (context, child) {
                return Transform.translate(
                  offset: Offset(0, _ordersSlide.value),
                  child: Opacity(
                    opacity: _ordersController.value,
                    child: child,
                  ),
                );
              },
              child: Padding(
                padding: const EdgeInsets.only(top: 16),
                child: _buildOrderHistorySection(),
              ),
            ),
          ),

          const SliverToBoxAdapter(
            child: SizedBox(height: 100),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileHeader() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.headerStart,
            AppColors.headerEnd,
          ],
        ),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.3),
            blurRadius: 15,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
          child: Column(
            children: [
              // Top bar with back button and settings
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Back button
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),
                  const Text(
                    'Profile',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                  // Settings button
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.settings_outlined, color: Colors.white, size: 20),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Settings coming soon!'),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              // Avatar with animated ring
              Stack(
                alignment: Alignment.center,
                children: [
                  // Outer decorative ring
                  Container(
                    width: 115,
                    height: 115,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.3),
                        width: 2,
                      ),
                    ),
                  ),
                  // Avatar
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 4),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.2),
                          blurRadius: 15,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        _getInitials(),
                        style: const TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                  // Edit button
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Icon(
                        Icons.camera_alt_rounded,
                        color: AppColors.primary,
                        size: 16,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Name
              Text(
                widget.userName ?? 'Guest User',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 4),
              // Profile ID Badge
              if (widget.profileId != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.verified_user_outlined,
                        color: Colors.white.withValues(alpha: 0.9),
                        size: 14,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'ID: ${widget.profileId!.substring(0, 8)}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.white.withValues(alpha: 0.9),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _getInitials() {
    if (widget.userName == null || widget.userName!.isEmpty) {
      return 'G';
    }
    final names = widget.userName!.trim().split(' ');
    if (names.length >= 2) {
      return '${names[0][0]}${names[1][0]}'.toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  int get _totalRoyaltyPoints {
    return orderStateManager.orders.fold(0, (sum, order) => sum + order.pointsEarned);
  }

  Widget _buildRoyaltyPointsCard() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              const Color(0xFFD4A848),
              const Color(0xFFB8860B),
              const Color(0xFF9A7B0A),
            ],
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: AppColors.gold.withValues(alpha: 0.4),
              blurRadius: 15,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Background decoration
            Positioned(
              right: -20,
              top: -20,
              child: Icon(
                Icons.star_rounded,
                size: 100,
                color: Colors.white.withValues(alpha: 0.1),
              ),
            ),
            Row(
              children: [
                // Points icon with animation effect
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(
                    Icons.stars_rounded,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Loyalty Points',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.25),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'GOLD',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '$_totalRoyaltyPoints',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              letterSpacing: -1,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Text(
                              'pts',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.8),
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Rewards button
                AnimatedScaleButton(
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Rewards catalog coming soon!'),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.card_giftcard, color: AppColors.gold, size: 18),
                        const SizedBox(width: 6),
                        Text(
                          'Redeem',
                          style: TextStyle(
                            color: AppColors.gold,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    final activeOrders = orderStateManager.activeOrders.length;
    final totalOrders = orderStateManager.orders.length;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stats Grid
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 15,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Column(
              children: [
                // First row - Main stats
                Row(
                  children: [
                    Expanded(
                      child: _buildStatItem(
                        icon: Icons.receipt_long_rounded,
                        label: 'Total Orders',
                        value: '$totalOrders',
                        iconBgColor: const Color(0xFF3B82F6).withValues(alpha: 0.1),
                        iconColor: const Color(0xFF3B82F6),
                        valueColor: const Color(0xFF3B82F6),
                      ),
                    ),
                    Container(
                      width: 1,
                      height: 50,
                      color: Colors.grey.withValues(alpha: 0.2),
                    ),
                    Expanded(
                      child: _buildStatItem(
                        icon: Icons.pending_actions_rounded,
                        label: 'Active',
                        value: '$activeOrders',
                        iconBgColor: const Color(0xFF10B981).withValues(alpha: 0.1),
                        iconColor: const Color(0xFF10B981),
                        valueColor: const Color(0xFF10B981),
                      ),
                    ),
                    Container(
                      width: 1,
                      height: 50,
                      color: Colors.grey.withValues(alpha: 0.2),
                    ),
                    Expanded(
                      child: _buildStatItem(
                        icon: Icons.shopping_bag_rounded,
                        label: 'In Cart',
                        value: '${cartService.itemCount}',
                        iconBgColor: const Color(0xFFF97316).withValues(alpha: 0.1),
                        iconColor: const Color(0xFFF97316),
                        valueColor: const Color(0xFFF97316),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Divider
                Container(
                  height: 1,
                  color: Colors.grey.withValues(alpha: 0.15),
                ),
                const SizedBox(height: 16),
                // Second row - Actions
                Row(
                  children: [
                    Expanded(
                      child: _buildQuickActionButton(
                        icon: Icons.history_rounded,
                        label: 'Order History',
                        onTap: () {
                          if (widget.profileId != null) {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => OrderHistoryPage(profileId: widget.profileId!),
                              ),
                            );
                          }
                        },
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildQuickActionButton(
                        icon: Icons.logout_rounded,
                        label: 'Logout',
                        onTap: _showLogoutDialog,
                        color: const Color(0xFFEF4444),
                        isDestructive: true,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required String value,
    required Color iconBgColor,
    required Color iconColor,
    required Color valueColor,
  }) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: iconBgColor,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: valueColor,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required Color color,
    bool isDestructive = false,
  }) {
    return AnimatedScaleButton(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        decoration: BoxDecoration(
          color: isDestructive ? color.withValues(alpha: 0.1) : color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: color.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderHistorySection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Recent Orders',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (orderStateManager.orders.isNotEmpty)
                TextButton(
                  onPressed: _loadOrders,
                  child: const Text('Refresh'),
                ),
            ],
          ),
          const SizedBox(height: 12),
          _buildOrdersList(),
        ],
      ),
    );
  }

  Widget _buildOrdersList() {
    if (orderStateManager.isLoading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (orderStateManager.error != null) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 12),
            Text(
              'Failed to load orders',
              style: TextStyle(color: Colors.grey[700]),
            ),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: _loadOrders,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (widget.profileId == null) {
      return _buildEmptyState(
        icon: Icons.person_off,
        title: 'Not Logged In',
        subtitle: 'Please log in to view your orders',
      );
    }

    final orders = orderStateManager.orders;

    if (orders.isEmpty) {
      return _buildEmptyState(
        icon: Icons.receipt_long_outlined,
        title: 'No Orders Yet',
        subtitle: 'Your order history will appear here',
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: orders.length > 5 ? 5 : orders.length,
      itemBuilder: (context, index) {
        return _buildOrderCard(orders[index]);
      },
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Icon(icon, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            title,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderCard(Order order) {
    final dateFormat = DateFormat('MMM dd, yyyy • hh:mm a');
    final (statusColor, statusIcon) = _getStatusStyle(order.status);

    return AnimatedScaleButton(
      onTap: () => _showOrderDetails(order),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Order #${order.orderNumber}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusIcon, size: 14, color: statusColor),
                      const SizedBox(width: 4),
                      
                    ],
                  ),
                ),
              ],
            ),
            Text(
                        order.status.value,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: statusColor,
                        ),
                      ),
            const SizedBox(height: 8),
            // Date
            Row(
              children: [
                Icon(Icons.access_time, size: 14, color: Colors.grey[500]),
                const SizedBox(width: 4),
                Text(
                  dateFormat.format(order.createdAt),
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
            const Divider(height: 20),
            // Items count and Total
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Text(
                      '${order.totalItems} ${order.totalItems == 1 ? 'item' : 'items'}',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(Icons.chevron_right, size: 16, color: Colors.grey[400]),
                  ],
                ),
                Text(
                  '\u20B9${order.grandTotalValue.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  (Color, IconData) _getStatusStyle(OrderStatus status) {
    switch (status) {
      case OrderStatus.completed:
        return (Colors.green, Icons.check_circle);
      case OrderStatus.pending:
        return (Colors.orange, Icons.pending);
      case OrderStatus.cancelled:
        return (Colors.red, Icons.cancel);
      case OrderStatus.preparing:
      case OrderStatus.confirmed:
        return (Colors.blue, Icons.sync);
      case OrderStatus.ready:
        return (Colors.teal, Icons.check);
    }
  }

  void _showOrderDetails(Order order) {
    final dateFormat = DateFormat('MMM dd, yyyy • hh:mm a');
    final (statusColor, statusIcon) = _getStatusStyle(order.status);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, scrollController) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Content
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  children: [
                    // Order Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Order #${order.orderNumber}',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              dateFormat.format(order.createdAt),
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(statusIcon, size: 16, color: statusColor),
                              const SizedBox(width: 6),
                              
                            ],
                          ),
                        ),
                      ],
                    ),
                    Text(
                                order.status.value,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: statusColor,
                                ),
                              ),

                    const SizedBox(height: 24),

                    // Order Timeline
                    if (order.confirmedAt != null || order.completedAt != null || order.cancelledAt != null)
                      _buildOrderTimeline(order),

                    // Items Section
                    const Text(
                      'Order Items',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...order.items.map((item) => _buildOrderItemCard(item)),

                    const SizedBox(height: 20),

                    // Price Breakdown
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        children: [
                          _buildPriceRow('Subtotal', order.subtotalValue),
                          if (order.discountTotalValue > 0) ...[
                            const SizedBox(height: 8),
                            _buildPriceRow('Discount', -order.discountTotalValue, isDiscount: true),
                          ],
                          if (order.taxAmountValue > 0) ...[
                            const SizedBox(height: 8),
                            _buildPriceRow('Tax', order.taxAmountValue),
                          ],
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12),
                            child: Divider(height: 1),
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Total',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                '\u20B9${order.grandTotalValue.toStringAsFixed(2)}',
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Points Earned
                    if (order.pointsEarned > 0) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.amber.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.amber.withValues(alpha: 0.2),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.stars, color: Colors.amber, size: 24),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Loyalty Points Earned',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: Colors.black87,
                                    ),
                                  ),
                                  Text(
                                    '+${order.pointsEarned} points',
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.amber,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    // Payment Method
                    if (order.paymentMethod != null) ...[
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Icon(Icons.payment, size: 18, color: Colors.grey[600]),
                          const SizedBox(width: 8),
                          Text(
                            'Paid via ${order.paymentMethod}',
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ],

                    // Notes
                    if (order.notes != null && order.notes!.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.blue.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.note, size: 18, color: Colors.blue[400]),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                order.notes!,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey[700],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOrderTimeline(Order order) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Order Timeline',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          _buildTimelineItem(
            'Order Placed',
            order.createdAt,
            Colors.blue,
            isFirst: true,
          ),
          if (order.confirmedAt != null)
            _buildTimelineItem(
              'Confirmed',
              order.confirmedAt!,
              Colors.green,
            ),
          if (order.completedAt != null)
            _buildTimelineItem(
              'Completed',
              order.completedAt!,
              Colors.green,
              isLast: order.cancelledAt == null,
            ),
          if (order.cancelledAt != null)
            _buildTimelineItem(
              'Cancelled',
              order.cancelledAt!,
              Colors.red,
              isLast: true,
            ),
        ],
      ),
    );
  }

  Widget _buildTimelineItem(String label, DateTime time, Color color, {bool isFirst = false, bool isLast = false}) {
    final timeFormat = DateFormat('MMM dd, hh:mm a');

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 30,
                color: Colors.grey[300],
              ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: EdgeInsets.only(bottom: isLast ? 0 : 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                Text(
                  timeFormat.format(time),
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildOrderItemCard(OrderItem item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
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
              borderRadius: BorderRadius.circular(3),
            ),
            child: Icon(
              Icons.circle,
              size: 8,
              color: item.isVeg ? Colors.green : Colors.red,
            ),
          ),
          const SizedBox(width: 10),
          // Item details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  item.categoryName,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[500],
                  ),
                ),
              ],
            ),
          ),
          // Quantity and price
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'x${item.quantity}',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '\u20B9${item.lineTotalValue.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, double amount, {bool isDiscount = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey[700],
          ),
        ),
        Text(
          '${isDiscount ? '-' : ''}\u20B9${amount.abs().toStringAsFixed(2)}',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: isDiscount ? Colors.green : Colors.black87,
          ),
        ),
      ],
    );
  }
}
