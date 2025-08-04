import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import 'package:ai_dashboard_frontend/models/product.dart';
import 'package:ai_dashboard_frontend/product_detail_page.dart';
import 'package:ai_dashboard_frontend/services/product_service.dart';
import 'package:ai_dashboard_frontend/services/cart_service.dart';
import 'package:ai_dashboard_frontend/services/order_service.dart';
import 'package:ai_dashboard_frontend/cart_page.dart';
import 'package:ai_dashboard_frontend/profile_page.dart';
import 'package:ai_dashboard_frontend/utils/animations.dart';
import 'package:ai_dashboard_frontend/widgets/app_loader.dart';
import 'package:ai_dashboard_frontend/widgets/shimmer_loading.dart';
import 'package:ai_dashboard_frontend/widgets/cozy_greeting.dart';
import 'package:ai_dashboard_frontend/widgets/festive_confetti.dart';
import 'package:ai_dashboard_frontend/widgets/chat_fab.dart';
import 'package:ai_dashboard_frontend/config/app_theme.dart';
import 'package:ai_dashboard_frontend/order_history_page.dart';

class HomePage extends StatefulWidget {
  final String? userName;
  final String? profileId;
  final bool showWelcome;

  const HomePage({super.key, this.userName, this.profileId, this.showWelcome = false});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _currentIndex = 0;

  List<Product> _products = [];
  List<Category> _categories = [];
  bool _isLoading = true;
  String? _error;

  // Recommendation sections
  List<Product> _personalizedProducts = [];
  List<Product> _featuredProducts = [];
  List<Product> _trendingProducts = [];
  bool _isLoadingRecommendations = true;

  // Active orders
  Timer? _activeOrdersTimer;

  // Filters
  final TextEditingController _searchController = TextEditingController();
  bool? _isVegFilter;
  String? _selectedCategoryId;
  int _currentPage = 1;
  int _totalPages = 1;
  static const int _limit = 20;

  // Greeting state
  bool _showGreeting = false;
  bool _greetingComplete = false;

  @override
  void initState() {
    super.initState();
    _loadCategories();
    _loadRecommendations();
    _loadProducts();
    _loadActiveOrders();
    _startActiveOrdersTimer();
    cartService.addListener(_onCartChanged);
    orderStateManager.addListener(_onOrdersChanged);

    // Show full-screen greeting when coming from splash
    if (widget.showWelcome) {
      _showGreeting = true;
    }
  }

  void _onGreetingComplete() {
    if (mounted) {
      setState(() {
        _greetingComplete = true;
      });
    }
  }

  void _startActiveOrdersTimer() {
    _activeOrdersTimer?.cancel();
    _activeOrdersTimer = Timer.periodic(
      const Duration(minutes: 1),
      (_) => _loadActiveOrders(),
    );
  }

  void _onCartChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  void _onOrdersChanged() {
    if (mounted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() {});
      });
    }
  }

  @override
  void dispose() {
    _activeOrdersTimer?.cancel();
    cartService.removeListener(_onCartChanged);
    orderStateManager.removeListener(_onOrdersChanged);
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadActiveOrders() async {
    await orderStateManager.loadOrders(widget.profileId);
  }

  Future<void> _loadCategories() async {
    try {
      final categories = await ProductService.getCategories();
      if (mounted) {
        setState(() {
          _categories = categories;
        });
      }
    } catch (e) {
      debugPrint('Failed to load categories: $e');
    }
  }

  Future<void> _loadRecommendations() async {
    setState(() {
      _isLoadingRecommendations = true;
    });

    try {
      final futures = <Future>[];

      // Personalized recommendations (only if profileId is available)
      if (widget.profileId != null && widget.profileId!.isNotEmpty) {
        futures.add(
          ProductService.getRecommendationsForProfile(widget.profileId!)
              .then((products) {
            if (mounted) {
              setState(() => _personalizedProducts = products);
            }
          }).catchError((e) {
            debugPrint('Failed to load personalized recommendations: $e');
          }),
        );
      }

      // Featured products
      futures.add(
        ProductService.getFeaturedProducts().then((products) {
          if (mounted) {
            setState(() => _featuredProducts = products);
          }
        }).catchError((e) {
          debugPrint('Failed to load featured products: $e');
        }),
      );

      // Trending products
      futures.add(
        ProductService.getTrendingProducts().then((products) {
          if (mounted) {
            setState(() => _trendingProducts = products);
          }
        }).catchError((e) {
          debugPrint('Failed to load trending products: $e');
        }),
      );

      await Future.wait(futures);
    } finally {
      if (mounted) {
        setState(() => _isLoadingRecommendations = false);
      }
    }
  }

  Future<void> _loadProducts() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await ProductService.getProducts(
        isVeg: _isVegFilter,
        category: _selectedCategoryId,
        search: _searchController.text.isNotEmpty ? _searchController.text : null,
        page: _currentPage,
        limit: _limit,
      );

      if (mounted) {
        setState(() {
          _products = response.products;
          _totalPages = response.pagination?.totalPages ?? 1;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _onSearchChanged() {
    _currentPage = 1;
    _loadProducts();
  }

  void _onCategorySelected(String? categoryId) {
    setState(() {
      _selectedCategoryId = categoryId;
      _currentPage = 1;
    });
    _loadProducts();
  }

  void _clearFilters() {
    setState(() {
      _searchController.clear();
      _isVegFilter = null;
      _selectedCategoryId = null;
      _currentPage = 1;
    });
    _loadProducts();
  }

  void _goToPage(int page) {
    if (page >= 1 && page <= _totalPages) {
      setState(() {
        _currentPage = page;
      });
      _loadProducts();
    }
  }

  @override
  Widget build(BuildContext context) {
    final scaffold = Scaffold(
      backgroundColor: AppColors.background,
      body: _buildCurrentTab(),
      floatingActionButton: ChatFAB(
        profileId: widget.profileId,
        userName: widget.userName,
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Floating cart bar
          if (cartService.isNotEmpty) _buildCartSummaryBar(),
          // Bottom navigation
          _buildBottomNavBar(),
        ],
      ),
    );

    // Wrap with CozyGreeting when coming from splash
    if (_showGreeting && !_greetingComplete) {
      return CozyGreeting(
        userName: widget.userName,
        onComplete: _onGreetingComplete,
        child: scaffold,
      );
    }

    return scaffold;
  }

  Widget _buildCartSummaryBar() {
    return GestureDetector(
      onTap: () {
        context.pushAnimated(
          CartPage(
            profileId: widget.profileId,
            userName: widget.userName,
          ),
          direction: SlideDirection.up,
        );
      },
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.primary, AppColors.primaryHover],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            // Cart icon with item count
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.shopping_bag_outlined, color: Colors.white, size: 20),
                  const SizedBox(width: 6),
                  Text(
                    '${cartService.itemCount}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            // Cart info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${cartService.itemCount} ${cartService.itemCount == 1 ? 'item' : 'items'} in cart',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '₹${cartService.totalAmount.toStringAsFixed(0)}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                ],
              ),
            ),
            // View cart button
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'View Cart',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(Icons.arrow_forward, color: AppColors.primary, size: 16),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentTab() {
    switch (_currentIndex) {
      case 0:
        return _buildHomeTab();
      case 1:
        return _buildCategoriesTab();
      case 2:
        return _buildMenuTab();
      case 3:
        return _buildOrdersTab();
      default:
        return _buildHomeTab();
    }
  }

  Widget _buildOrdersTab() {
    if (widget.profileId == null || widget.profileId!.isEmpty) {
      return SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.receipt_long_outlined,
                size: 80,
                color: Colors.grey[300],
              ),
              const SizedBox(height: 16),
              Text(
                'Please login to view orders',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      );
    }
    return OrderHistoryPage(profileId: widget.profileId!, embedded: true);
  }

  Widget _buildBottomNavBar() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 70,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(0, Icons.home_rounded, Icons.home_outlined, 'Home'),
              _buildNavItem(1, Icons.grid_view_rounded, Icons.grid_view_outlined, 'Category'),
              _buildNavItem(2, Icons.restaurant_menu_rounded, Icons.restaurant_menu_outlined, 'Menu'),
              _buildNavItem(3, Icons.receipt_long_rounded, Icons.receipt_long_outlined, 'Orders'),
              _buildCartNavItem(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData activeIcon, IconData inactiveIcon, String label) {
    final isSelected = _currentIndex == index;
    return GestureDetector(
      onTap: () {
        setState(() {
          _currentIndex = index;
        });
      },
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 58,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isSelected ? activeIcon : inactiveIcon,
              color: isSelected ? AppColors.primary : Colors.grey[400],
              size: 24,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                color: isSelected ? AppColors.primary : Colors.grey[500],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCartNavItem() {
    return GestureDetector(
      onTap: () {
        context.pushAnimated(
          CartPage(
            profileId: widget.profileId,
            userName: widget.userName,
          ),
          direction: SlideDirection.up,
        );
      },
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 58,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  Icons.shopping_cart_outlined,
                  color: Colors.grey[400],
                  size: 24,
                ),
                if (cartService.itemCount > 0)
                  Positioned(
                    right: -8,
                    top: -8,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                      child: Text(
                        '${cartService.itemCount}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Cart',
              style: TextStyle(
                fontSize: 10,
                color: Colors.grey[500],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHomeTab() {
    return RefreshIndicator(
      onRefresh: () async {
        await Future.wait([
          _loadCategories(),
          _loadRecommendations(),
        ]);
      },
      child: CustomScrollView(
        slivers: [
          // Header with gradient background and festive greeting
          SliverToBoxAdapter(child: _buildHeader()),

          // Loading indicator
          if (_isLoadingRecommendations &&
              _personalizedProducts.isEmpty &&
              _featuredProducts.isEmpty &&
              _trendingProducts.isEmpty)
            const SliverToBoxAdapter(
              child: HorizontalProductListSkeleton(itemCount: 3),
            ),
          // Personalized Recommendations (first)
          if (_personalizedProducts.isNotEmpty)
            SliverToBoxAdapter(
              child: _buildProductSection(
                title: 'Recommended for You',
                subtitle: 'Picked just for you',
                products: _personalizedProducts,
                topPadding: 18,
              ),
            ),

          // Bestsellers / Trending (second)
          if (_trendingProducts.isNotEmpty)
            SliverToBoxAdapter(
              child: _buildProductSection(
                title: 'Bestsellers!',
                subtitle: 'Most loved by customers',
                products: _trendingProducts,
                topPadding: 8,
              ),
            ),

          // Categories (third)
          if (_categories.isNotEmpty)
            SliverToBoxAdapter(child: _buildCategoriesSlider()),

          // Featured Products (last)
          if (_featuredProducts.isNotEmpty)
            SliverToBoxAdapter(
              child: _buildProductSection(
                title: 'Featured',
                subtitle: 'Handpicked by our baristas',
                products: _featuredProducts,
                topPadding: 8,
              ),
            ),

          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
    );
  }

  Widget _buildCategoriesTab() {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.grid_view_rounded,
                    color: AppColors.primary,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 14),
                const Text(
                  'Categories',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
          ),
          // Categories grid
          Expanded(
            child: _categories.isEmpty
                ? const Center(child: AppLoader())
                : GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      childAspectRatio: 1.1,
                    ),
                    itemCount: _categories.length,
                    itemBuilder: (context, index) {
                      return _buildCategoryCard(_categories[index]);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryCard(Category category) {
    return GestureDetector(
      onTap: () {
        // Navigate to menu tab with this category selected
        setState(() {
          _selectedCategoryId = category.id;
          _currentIndex = 2; // Switch to Menu tab
        });
        _loadProducts();
      },
      child: Container(
        width: 130,
        height: 100,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Category image or fallback with placeholder
              _buildCategoryImage(category),
              // Gradient overlay for text readability
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black.withValues(alpha: 0.75),
                      ],
                    ),
                  ),
                  child: Text(
                    category.name,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryImage(Category category) {
    // Check if category has an image URL
    if (category.imageUrl != null && category.imageUrl!.isNotEmpty) {
      return Image.network(
        category.imageUrl!,
        fit: BoxFit.cover,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return _buildCategoryPlaceholder(category);
        },
        errorBuilder: (context, error, stackTrace) {
          return _buildCategoryPlaceholder(category);
        },
      );
    }
    return _buildCategoryPlaceholder(category);
  }

  Widget _buildCategoryPlaceholder(Category category) {
    // Beautiful placeholder with gradient background based on category
    final colors = _getCategoryColors(category.name);
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: colors,
        ),
      ),
      child: Center(
        child: Icon(
          _getCategoryIcon(category.name),
          size: 48,
          color: Colors.white.withValues(alpha: 0.8),
        ),
      ),
    );
  }

  List<Color> _getCategoryColors(String categoryName) {
    final name = categoryName.toLowerCase();
    if (name.contains('coffee') || name.contains('espresso')) {
      return [const Color(0xFF8B4513), const Color(0xFF5D3A1A)];
    } else if (name.contains('tea')) {
      return [const Color(0xFF2E8B57), const Color(0xFF1D5A3A)];
    } else if (name.contains('cold') || name.contains('iced') || name.contains('shake')) {
      return [const Color(0xFF4682B4), const Color(0xFF2C5272)];
    } else if (name.contains('snack') || name.contains('food') || name.contains('sandwich')) {
      return [const Color(0xFFD2691E), const Color(0xFF8B4513)];
    } else if (name.contains('dessert') || name.contains('cake') || name.contains('sweet')) {
      return [const Color(0xFFDB7093), const Color(0xFFC44569)];
    } else if (name.contains('breakfast')) {
      return [const Color(0xFFFFB347), const Color(0xFFE8912D)];
    } else if (name.contains('juice') || name.contains('smoothie')) {
      return [const Color(0xFF98D8C8), const Color(0xFF5BAD92)];
    } else {
      return [AppColors.primary, AppColors.primaryHover];
    }
  }

  IconData _getCategoryIcon(String categoryName) {
    final name = categoryName.toLowerCase();
    if (name.contains('coffee') || name.contains('espresso')) {
      return Icons.coffee_rounded;
    } else if (name.contains('tea')) {
      return Icons.emoji_food_beverage_rounded;
    } else if (name.contains('cold') || name.contains('iced') || name.contains('shake')) {
      return Icons.local_cafe_rounded;
    } else if (name.contains('snack') || name.contains('food') || name.contains('sandwich')) {
      return Icons.lunch_dining_rounded;
    } else if (name.contains('dessert') || name.contains('cake') || name.contains('sweet')) {
      return Icons.cake_rounded;
    } else if (name.contains('breakfast')) {
      return Icons.breakfast_dining_rounded;
    } else if (name.contains('juice') || name.contains('smoothie')) {
      return Icons.local_bar_rounded;
    } else {
      return Icons.restaurant_menu_rounded;
    }
  }

  Widget _buildHeader() {
    final hour = DateTime.now().hour;
    final (title, subtitle, icon) = _getFestiveGreeting(hour);

    return FestiveConfetti(
      enabled: true,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.headerStart,
              AppColors.headerEnd,
            ],
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top row with avatar and settings
                Row(
                  children: [
                    // Avatar
                    GestureDetector(
                      onTap: () {
                        context.pushAnimated(
                          ProfilePage(
                            userName: widget.userName,
                            profileId: widget.profileId,
                          ),
                        );
                      },
                      child: Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: ClipOval(
                          child: Icon(
                            Icons.person,
                            color: AppColors.primary,
                            size: 24,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Welcome text with festive greeting
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Welcome, ${widget.userName ?? "Guest"}',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.9),
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Icon(icon, color: Colors.white, size: 16),
                              const SizedBox(width: 5),
                              Expanded(
                                child: Text(
                                  title,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    // Settings icon
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: const Icon(Icons.tune, color: Colors.white, size: 18),
                        onPressed: () {
                          context.pushAnimated(
                            ProfilePage(
                              userName: widget.userName,
                              profileId: widget.profileId,
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                // Subtitle text
                Text(
                  subtitle,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontSize: 14,
                    fontStyle: FontStyle.italic,
                  ),
                ),
                const SizedBox(height: 12),
                // Search bar
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(25),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (_) => _onSearchChanged(),
                    decoration: InputDecoration(
                      hintText: 'Search for "Coffee"',
                      hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
                      prefixIcon: Icon(Icons.search, color: Colors.grey[400], size: 22),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  (String, String, IconData) _getFestiveGreeting(int hour) {
    if (hour >= 5 && hour < 12) {
      return ('Good Morning! ☀️', 'Freshly brewed coffee awaits you', Icons.wb_sunny_rounded);
    } else if (hour >= 12 && hour < 17) {
      return ('Afternoon Pick-me-up ☕', 'Beat the afternoon slump with coffee', Icons.coffee_rounded);
    } else if (hour >= 17 && hour < 21) {
      return ('Evening Delight 🌙', 'Unwind with a warm cup of joy', Icons.nightlight_round);
    } else {
      return ('Night Owl Special 🦉', 'Late night cravings? We got you!', Icons.nights_stay_rounded);
    }
  }

  // Widget _buildPromoCard() {
  //   return Container(
  //     margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
  //     padding: const EdgeInsets.all(16),
  //     decoration: BoxDecoration(
  //       gradient: LinearGradient(
  //         colors: [
  //           const Color(0xFFE8F5E9),
  //           const Color(0xFFC8E6C9),
  //         ],
  //       ),
  //       borderRadius: BorderRadius.circular(16),
  //     ),
  //     child: Row(
  //       children: [
  //         Expanded(
  //           flex: 3,
  //           child: Column(
  //             crossAxisAlignment: CrossAxisAlignment.start,
  //             children: [
  //               RichText(
  //                 text: TextSpan(
  //                   children: [
  //                     TextSpan(
  //                       text: 'Special Offer. ',
  //                       style: TextStyle(
  //                         fontSize: 18,
  //                         fontWeight: FontWeight.bold,
  //                         color: Colors.grey[800],
  //                       ),
  //                     ),
  //                     TextSpan(
  //                       text: 'Limited time!',
  //                       style: TextStyle(
  //                         fontSize: 16,
  //                         color: Colors.grey[600],
  //                       ),
  //                     ),
  //                   ],
  //                 ),
  //               ),
  //               const SizedBox(height: 8),
  //               Text(
  //                 'Enjoy your coffee at\n₹99 / ₹149 per cup.',
  //                 style: TextStyle(
  //                   fontSize: 14,
  //                   color: Colors.grey[700],
  //                   height: 1.4,
  //                 ),
  //               ),
  //               const SizedBox(height: 12),
  //               Container(
  //                 padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
  //                 decoration: BoxDecoration(
  //                   color: AppColors.primary,
  //                   borderRadius: BorderRadius.circular(20),
  //                 ),
  //                 child: const Text(
  //                   'Order Now',
  //                   style: TextStyle(
  //                     color: Colors.white,
  //                     fontWeight: FontWeight.w600,
  //                     fontSize: 12,
  //                   ),
  //                 ),
  //               ),
  //             ],
  //           ),
  //         ),
  //         Expanded(
  //           flex: 2,
  //           child: Icon(
  //             Icons.coffee,
  //             size: 80,
  //             color: AppColors.primary.withValues(alpha: 0.3),
  //           ),
  //         ),
  //       ],
  //     ),
  //   );
  // }

  Widget _buildProductSection({
    required String title,
    required String subtitle,
    required List<Product> products,
    double topPadding = 16,
  }) {
    return Padding(
      padding: EdgeInsets.fromLTRB(16, topPadding, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 175,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: products.length,
              itemBuilder: (context, index) {
                return _buildSimpleProductCard(products[index]);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSimpleProductCard(Product product) {
    final itemCount = cartService.getQuantity(product.id);

    return GestureDetector(
      onTap: () {
        context.pushAnimated(ProductDetailPage(productId: product.id));
      },
      child: Container(
        width: 130,
        margin: const EdgeInsets.only(right: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Product image with add button
            Stack(
              children: [
                // Product image
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: product.imageUrl != null
                      ? Image.network(
                          product.imageUrl!,
                          height: 110,
                          width: 130,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            height: 110,
                            width: 130,
                            color: const Color(0xFFF5F0EB),
                            child: Icon(
                              Icons.coffee_rounded,
                              size: 40,
                              color: AppColors.primary.withValues(alpha: 0.5),
                            ),
                          ),
                        )
                      : Container(
                          height: 110,
                          width: 130,
                          color: const Color(0xFFF5F0EB),
                          child: Icon(
                            Icons.coffee_rounded,
                            size: 40,
                            color: AppColors.primary.withValues(alpha: 0.5),
                          ),
                        ),
                ),
                // Add button aligned with image
                Positioned(
                  right: 6,
                  bottom: 6,
                  child: _buildCartButton(product, itemCount),
                ),
              ],
            ),
            const SizedBox(height: 6),
            // Product name
            Text(
              product.name,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                height: 1.2,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            // Price
            Text(
              '₹${product.effectivePrice}',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCartButton(Product product, int itemCount) {
    if (itemCount > 0) {
      // Show counter with +/- buttons
      return Container(
        height: 26,
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(13),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Minus button
            GestureDetector(
              onTap: () {
                cartService.decrementQuantity(product.id);
                setState(() {});
              },
              child: Container(
                width: 26,
                height: 26,
                alignment: Alignment.center,
                child: const Icon(Icons.remove, color: Colors.white, size: 14),
              ),
            ),
            // Count
            Container(
              constraints: const BoxConstraints(minWidth: 18),
              alignment: Alignment.center,
              child: Text(
                '$itemCount',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
            // Plus button
            GestureDetector(
              onTap: () {
                cartService.addToCart(product);
                setState(() {});
              },
              child: Container(
                width: 26,
                height: 26,
                alignment: Alignment.center,
                child: const Icon(Icons.add, color: Colors.white, size: 14),
              ),
            ),
          ],
        ),
      );
    }

    // Show simple add icon
    return GestureDetector(
      onTap: () {
        cartService.addToCart(product);
        setState(() {});
      },
      child: Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(6),
        ),
        child: const Icon(
          Icons.add,
          color: Colors.white,
          size: 16,
        ),
      ),
    );
  }

  Widget _buildMenuTab() {
    return SafeArea(
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
            decoration: BoxDecoration(
              color: Colors.white,
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
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Icons.restaurant_menu_rounded,
                        color: AppColors.primary,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 14),
                    const Text(
                      'Menu',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Search Bar
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search for coffee, snacks...',
                    hintStyle: TextStyle(color: Colors.grey[400]),
                    prefixIcon: Icon(Icons.search, color: Colors.grey[400]),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: Icon(Icons.clear, color: Colors.grey[400]),
                            onPressed: () {
                              _searchController.clear();
                              _onSearchChanged();
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(30),
                      borderSide: BorderSide.none,
                    ),
                    filled: true,
                    fillColor: Colors.grey[100],
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                  ),
                  onSubmitted: (_) => _onSearchChanged(),
                  textInputAction: TextInputAction.search,
                ),
              ],
            ),
          ),

          // Category Filter Chips
          if (_categories.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: SizedBox(
                height: 40,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _categories.length + 1,
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      // All Categories chip
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: const Text('All'),
                          selected: _selectedCategoryId == null,
                          onSelected: (_) => _onCategorySelected(null),
                          selectedColor: AppColors.primary,
                          labelStyle: TextStyle(
                            color: _selectedCategoryId == null ? Colors.white : Colors.black,
                          ),
                        ),
                      );
                    }
                    final category = _categories[index - 1];
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text(category.name),
                        selected: _selectedCategoryId == category.id,
                        onSelected: (_) => _onCategorySelected(category.id),
                        selectedColor: AppColors.primary,
                        labelStyle: TextStyle(
                          color: _selectedCategoryId == category.id ? Colors.white : Colors.black,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),

          // Veg Filter
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                FilterChip(
                  label: const Text('Veg Only'),
                  selected: _isVegFilter == true,
                  onSelected: (selected) {
                    setState(() {
                      _isVegFilter = selected ? true : null;
                    });
                    _onSearchChanged();
                  },
                  avatar: Icon(
                    Icons.eco,
                    size: 18,
                    color: _isVegFilter == true ? Colors.white : Colors.green,
                  ),
                  selectedColor: Colors.green,
                  labelStyle: TextStyle(
                    color: _isVegFilter == true ? Colors.white : Colors.black,
                  ),
                ),
                if (_isVegFilter != null ||
                    _selectedCategoryId != null ||
                    _searchController.text.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  ActionChip(
                    label: const Text('Clear All'),
                    avatar: const Icon(Icons.clear_all, size: 18, color: Colors.black),
                    labelStyle: const TextStyle(color: Colors.black),
                    onPressed: _clearFilters,
                  ),
                ],
              ],
            ),
          ),

          // Products Grid
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadProducts,
              child: _buildProductsGrid(),
            ),
          ),

          // Pagination
          if (!_isLoading && _products.isNotEmpty && _totalPages > 1)
            _buildPagination(),
        ],
      ),
    );
  }

  Widget _buildCategoriesSlider() {
    // Split categories into pairs for 2-row layout
    final int pairCount = (_categories.length / 2).ceil();

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Categories',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                ),
                
              ],
            ),
          ),
          SizedBox(
            height: 215,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: pairCount,
              itemBuilder: (context, pairIndex) {
                final firstIndex = pairIndex * 2;
                final secondIndex = firstIndex + 1;

                return Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: Column(
                    children: [
                      // First category in pair
                      if (firstIndex < _categories.length)
                        _buildCategoryCard(_categories[firstIndex]),
                      const SizedBox(height: 10),
                      // Second category in pair
                      if (secondIndex < _categories.length)
                        _buildCategoryCard(_categories[secondIndex])
                      else
                        const SizedBox(height: 100), // Empty space if odd number
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductsGrid() {
    if (_isLoading) {
      return const Center(child: AppLoader());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Failed to load products',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              _error!,
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadProducts,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_products.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.inventory_2_outlined, size: 48, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              'No products found',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            if (_searchController.text.isNotEmpty ||
                _isVegFilter != null ||
                _selectedCategoryId != null)
              TextButton(
                onPressed: _clearFilters,
                child: const Text('Clear filters'),
              ),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.75,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: _products.length,
      itemBuilder: (context, index) {
        return _ProductCard(
          product: _products[index],
          profileId: widget.profileId,
          userName: widget.userName,
        );
      },
    );
  }

  Widget _buildPagination() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.2),
            offset: const Offset(0, -2),
            blurRadius: 4,
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: _currentPage > 1 ? () => _goToPage(_currentPage - 1) : null,
          ),
          const SizedBox(width: 8),
          Text(
            'Page $_currentPage of $_totalPages',
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: _currentPage < _totalPages ? () => _goToPage(_currentPage + 1) : null,
          ),
        ],
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Product product;
  final String? profileId;
  final String? userName;

  const _ProductCard({
    required this.product,
    this.profileId,
    this.userName,
  });

  void _addToCart() {
    cartService.addToCart(product);
  }

  @override
  Widget build(BuildContext context) {
    final displayImageUrl = product.thumbnailUrl ?? product.imageUrl;
    final isInCart = cartService.containsProduct(product.id);
    final quantityInCart = cartService.getQuantity(product.id);

    return AnimatedScaleButton(
      scaleDown: 0.97,
      onTap: () {
        context.pushAnimated(
          ProductDetailPage(
            productId: product.id,
            profileId: profileId,
            userName: userName,
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 20,
              offset: const Offset(0, 4),
              spreadRadius: -2,
            ),
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 6,
              offset: const Offset(0, 2),
              spreadRadius: 0,
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product Image
            Expanded(
              child: Stack(
                children: [
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(16),
                      ),
                    ),
                    child: displayImageUrl != null
                        ? ClipRRect(
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(16),
                            ),
                            child: Image.network(
                              displayImageUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Center(
                                child: Icon(Icons.fastfood, size: 40, color: Colors.grey[400]),
                              ),
                            ),
                          )
                        : Center(
                            child: Icon(Icons.fastfood, size: 40, color: Colors.grey[400]),
                          ),
                  ),
                  // Veg/Non-veg indicator - modern pill style
                  Positioned(
                    top: 10,
                    left: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
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
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: product.isVeg ? const Color(0xFF22C55E) : AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            product.isVeg ? 'Veg' : 'Non-Veg',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: product.isVeg ? const Color(0xFF22C55E) : AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Discount badge - modern gradient style
                  if (product.hasActiveDiscount)
                    Positioned(
                      top: 10,
                      right: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFEF4444), Color(0xFFF97316)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFEF4444).withValues(alpha: 0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Text(
                          '${product.discountPercentage}% OFF',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Product Info - improved spacing and typography
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    product.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: Color(0xFF1A1A2E),
                      height: 1.2,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Price section - improved styling
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '\u20B9${product.effectivePrice}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: Color(0xFF22C55E),
                              letterSpacing: -0.3,
                            ),
                          ),
                          if (product.hasActiveDiscount)
                            Text(
                              '\u20B9${product.price}',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey[400],
                                decoration: TextDecoration.lineThrough,
                                decorationColor: Colors.grey[400],
                              ),
                            ),
                        ],
                      ),
                      // Add to Cart / Quantity controls - modern styling
                      isInCart
                          ? Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFFDCFCE7),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Material(
                                    color: Colors.transparent,
                                    child: InkWell(
                                      borderRadius: const BorderRadius.horizontal(left: Radius.circular(10)),
                                      onTap: () => cartService.decrementQuantity(product.id),
                                      child: const Padding(
                                        padding: EdgeInsets.all(6),
                                        child: Icon(Icons.remove, size: 16, color: Color(0xFF22C55E)),
                                      ),
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 8),
                                    child: Text(
                                      '$quantityInCart',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF22C55E),
                                        fontSize: 14,
                                      ),
                                    ),
                                  ),
                                  Material(
                                    color: Colors.transparent,
                                    child: InkWell(
                                      borderRadius: const BorderRadius.horizontal(right: Radius.circular(10)),
                                      onTap: () => cartService.incrementQuantity(product.id),
                                      child: const Padding(
                                        padding: EdgeInsets.all(6),
                                        child: Icon(Icons.add, size: 16, color: Color(0xFF22C55E)),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : BouncingWidget(
                              enabled: product.isAvailable,
                              onTap: _addToCart,
                              child: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  gradient: product.isAvailable
                                      ? const LinearGradient(
                                          colors: [AppColors.primary, AppColors.primaryLight],
                                          begin: Alignment.topLeft,
                                          end: Alignment.bottomRight,
                                        )
                                      : null,
                                  color: product.isAvailable ? null : Colors.grey[300],
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: product.isAvailable
                                      ? [
                                          BoxShadow(
                                            color: AppColors.primary.withValues(alpha: 0.3),
                                            blurRadius: 8,
                                            offset: const Offset(0, 2),
                                          ),
                                        ]
                                      : null,
                                ),
                                child: const Icon(
                                  Icons.add,
                                  color: Colors.white,
                                  size: 18,
                                ),
                              ),
                            ),
                    ],
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

class _WelcomeLoader extends StatefulWidget {
  const _WelcomeLoader();

  @override
  State<_WelcomeLoader> createState() => _WelcomeLoaderState();
}

class _WelcomeLoaderState extends State<_WelcomeLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    _opacityAnimation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Transform.scale(
            scale: _scaleAnimation.value,
            child: Opacity(
              opacity: _opacityAnimation.value,
              child: child,
            ),
          );
        },
        child: Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.primary.withValues(alpha: 0.15),
                AppColors.primary.withValues(alpha: 0.05),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryLight],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.4),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Icon(
                Icons.restaurant_menu,
                color: Colors.white,
                size: 36,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// Animated Welcome Dialog Content
class _WelcomeDialogContent extends StatefulWidget {
  final String? userName;
  final VoidCallback onDismiss;

  const _WelcomeDialogContent({
    required this.userName,
    required this.onDismiss,
  });

  @override
  State<_WelcomeDialogContent> createState() => _WelcomeDialogContentState();
}

class _WelcomeDialogContentState extends State<_WelcomeDialogContent>
    with TickerProviderStateMixin {
  late AnimationController _lottieEntryController;
  late AnimationController _textController;
  late AnimationController _buttonController;
  late AnimationController _confettiController;

  late Animation<double> _lottieScale;
  late Animation<double> _titleSlide;
  late Animation<double> _titleOpacity;
  late Animation<double> _subtitleSlide;
  late Animation<double> _subtitleOpacity;
  late Animation<double> _buttonSlide;
  late Animation<double> _buttonOpacity;

  @override
  void initState() {
    super.initState();

    // Lottie entry animation
    _lottieEntryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _lottieScale = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _lottieEntryController, curve: Curves.elasticOut),
    );

    // Text animations
    _textController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _titleSlide = Tween<double>(begin: 30, end: 0).animate(
      CurvedAnimation(
        parent: _textController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOutCubic),
      ),
    );
    _titleOpacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: _textController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
      ),
    );
    _subtitleSlide = Tween<double>(begin: 30, end: 0).animate(
      CurvedAnimation(
        parent: _textController,
        curve: const Interval(0.3, 0.8, curve: Curves.easeOutCubic),
      ),
    );
    _subtitleOpacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: _textController,
        curve: const Interval(0.3, 0.8, curve: Curves.easeOut),
      ),
    );

    // Button animation
    _buttonController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _buttonSlide = Tween<double>(begin: 40, end: 0).animate(
      CurvedAnimation(parent: _buttonController, curve: Curves.easeOutCubic),
    );
    _buttonOpacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _buttonController, curve: Curves.easeOut),
    );

    // Confetti/sparkle animation
    _confettiController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    // Start animations in sequence
    _startAnimations();
  }

  Future<void> _startAnimations() async {
    await Future.delayed(const Duration(milliseconds: 100));
    _lottieEntryController.forward();
    await Future.delayed(const Duration(milliseconds: 300));
    _textController.forward();
    await Future.delayed(const Duration(milliseconds: 400));
    _buttonController.forward();
    _confettiController.repeat();
  }

  @override
  void dispose() {
    _lottieEntryController.dispose();
    _textController.dispose();
    _buttonController.dispose();
    _confettiController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Material(
        color: Colors.transparent,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 32),
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 30,
                offset: const Offset(0, 15),
                spreadRadius: -5,
              ),
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.1),
                blurRadius: 40,
                offset: const Offset(0, 10),
                spreadRadius: -10,
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Animated Lottie with sparkles
              AnimatedBuilder(
                animation: _lottieEntryController,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _lottieScale.value,
                    child: child,
                  );
                },
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Animated background rings
                    AnimatedBuilder(
                      animation: _confettiController,
                      builder: (context, child) {
                        return Container(
                          width: 180,
                          height: 180,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppColors.primary.withValues(
                                alpha: 0.1 * (1 - _confettiController.value),
                              ),
                              width: 2 + (_confettiController.value * 20),
                            ),
                          ),
                        );
                      },
                    ),
                    // Lottie animation container
                    Container(
                      width: 160,
                      height: 160,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppColors.primary.withValues(alpha: 0.08),
                            AppColors.gold.withValues(alpha: 0.08),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        shape: BoxShape.circle,
                      ),
                      child: Lottie.network(
                        'https://assets2.lottiefiles.com/packages/lf20_ysrn2iwp.json',
                        fit: BoxFit.contain,
                        frameBuilder: (context, child, composition) {
                          if (composition == null) {
                            return _buildFallbackIcon();
                          }
                          return child;
                        },
                        errorBuilder: (context, error, stackTrace) => _buildFallbackIcon(),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Animated Title
              AnimatedBuilder(
                animation: _textController,
                builder: (context, child) {
                  return Transform.translate(
                    offset: Offset(0, _titleSlide.value),
                    child: Opacity(
                      opacity: _titleOpacity.value,
                      child: child,
                    ),
                  );
                },
                child: Column(
                  children: [
                    Text(
                      'Welcome${widget.userName != null ? "," : "!"}',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w700,
                        color: Colors.grey[800],
                        letterSpacing: -0.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (widget.userName != null) ...[
                      const SizedBox(height: 4),
                      ShaderMask(
                        shaderCallback: (bounds) => const LinearGradient(
                          colors: [AppColors.primary, AppColors.primaryLight],
                        ).createShader(bounds),
                        child: Text(
                          widget.userName!,
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: -0.5,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Animated Subtitle
              AnimatedBuilder(
                animation: _textController,
                builder: (context, child) {
                  return Transform.translate(
                    offset: Offset(0, _subtitleSlide.value),
                    child: Opacity(
                      opacity: _subtitleOpacity.value,
                      child: child,
                    ),
                  );
                },
                child: Text(
                  'Discover delicious food and\nplace your order in seconds!',
                  style: TextStyle(
                    fontSize: 15,
                    color: Colors.grey[500],
                    height: 1.5,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 28),

              // Animated Button
              AnimatedBuilder(
                animation: _buttonController,
                builder: (context, child) {
                  return Transform.translate(
                    offset: Offset(0, _buttonSlide.value),
                    child: Opacity(
                      opacity: _buttonOpacity.value,
                      child: child,
                    ),
                  );
                },
                child: SizedBox(
                  width: double.infinity,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.primary, AppColors.primaryLight],
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      ),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.35),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: widget.onDismiss,
                        child: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                "Let's Explore",
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                  letterSpacing: 0.3,
                                ),
                              ),
                              SizedBox(width: 8),
                              Icon(
                                Icons.arrow_forward_rounded,
                                color: Colors.white,
                                size: 20,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFallbackIcon() {
    return Center(
      child: Container(
        width: 100,
        height: 100,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.primary, AppColors.primaryLight],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.4),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: const Icon(
          Icons.restaurant_menu_rounded,
          color: Colors.white,
          size: 50,
        ),
      ),
    );
  }
}
