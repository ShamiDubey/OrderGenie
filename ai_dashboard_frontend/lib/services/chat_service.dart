import 'package:flutter/foundation.dart';
import 'package:ai_dashboard_frontend/models/chat.dart';
import 'package:ai_dashboard_frontend/models/product.dart';
import 'package:ai_dashboard_frontend/models/order.dart';
import 'package:ai_dashboard_frontend/services/product_service.dart';
import 'package:ai_dashboard_frontend/services/cart_service.dart';
import 'package:ai_dashboard_frontend/services/order_service.dart';

/// Intent types for parsing user messages
enum ChatIntent {
  greet,
  help,
  searchProducts,
  showMenu,
  showRecommendations,
  showTrending,
  addToCart,
  removeFromCart,
  viewCart,
  clearCart,
  placeOrder,
  confirmOrder,
  cancelOrder,
  orderStatus,
  unknown,
}

/// Parsed intent with extracted entities
class ParsedIntent {
  final ChatIntent intent;
  final String? query;
  final String? productId;
  final String? productName;
  final int quantity;
  final bool? isVeg;
  final bool isConfirmation;

  ParsedIntent({
    required this.intent,
    this.query,
    this.productId,
    this.productName,
    this.quantity = 1,
    this.isVeg,
    this.isConfirmation = false,
  });
}

class ChatService extends ChangeNotifier {
  static final ChatService _instance = ChatService._internal();
  factory ChatService() => _instance;
  ChatService._internal();

  final List<ChatMessage> _messages = [];
  bool _isTyping = false;
  String? _profileId;
  String? _userName;

  // Track pending order confirmation
  bool _awaitingOrderConfirmation = false;

  // Cache for last search results (to match product names to IDs)
  List<Product> _lastSearchResults = [];

  List<ChatMessage> get messages => List.unmodifiable(_messages);
  bool get isTyping => _isTyping;

  void initialize({String? profileId, String? userName}) {
    _profileId = profileId;
    _userName = userName;
    _messages.clear();
    _awaitingOrderConfirmation = false;
    _lastSearchResults = [];

    // Add welcome message
    _messages.add(ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      role: MessageRole.assistant,
      content: _userName != null
          ? 'Hi $_userName! 👋 I\'m your ordering assistant. I can help you:\n\n'
            '• Browse the menu - "show menu" or "show burgers"\n'
            '• Find items - "search pizza" or "show veg items"\n'
            '• Manage cart - "add burger" or "show cart"\n'
            '• Place orders - "checkout" or "place order"\n\n'
            'What would you like today?'
          : 'Hi! 👋 I\'m your ordering assistant. How can I help you today?\n\n'
            'Try saying "show menu" or "recommend something"',
    ));
    notifyListeners();
  }

  void clearChat() {
    _messages.clear();
    _awaitingOrderConfirmation = false;
    _lastSearchResults = [];
    initialize(profileId: _profileId, userName: _userName);
  }

  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty) return;

    // Add user message to UI
    final userMessage = ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      role: MessageRole.user,
      content: text,
    );
    _messages.add(userMessage);

    // Add loading message
    final loadingId = '${DateTime.now().millisecondsSinceEpoch}_loading';
    _messages.add(ChatMessage(
      id: loadingId,
      role: MessageRole.assistant,
      content: '',
      isLoading: true,
    ));
    _isTyping = true;
    notifyListeners();

    try {
      // Parse intent and generate response
      final response = await _processMessage(text);

      // Remove loading message
      _messages.removeWhere((m) => m.id == loadingId);
      _isTyping = false;

      if (response != null) {
        _messages.add(response);
      }
    } catch (e) {
      // Remove loading message and show error
      _messages.removeWhere((m) => m.id == loadingId);
      _isTyping = false;
      _messages.add(ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: 'Sorry, something went wrong. Please try again.',
      ));
      debugPrint('Chat error: $e');
    }

    notifyListeners();
  }

  Future<ChatMessage?> _processMessage(String text) async {
    final lowerText = text.toLowerCase().trim();

    // Check for order confirmation first
    if (_awaitingOrderConfirmation) {
      return await _handleOrderConfirmation(lowerText);
    }

    // Parse user intent
    final intent = _parseIntent(lowerText);

    // Execute based on intent
    switch (intent.intent) {
      case ChatIntent.greet:
        return _handleGreeting();
      case ChatIntent.help:
        return _handleHelp();
      case ChatIntent.showMenu:
      case ChatIntent.searchProducts:
        return await _handleSearch(intent);
      case ChatIntent.showRecommendations:
        return await _handleRecommendations();
      case ChatIntent.showTrending:
        return await _handleTrending();
      case ChatIntent.addToCart:
        return await _handleAddToCart(intent, lowerText);
      case ChatIntent.removeFromCart:
        return await _handleRemoveFromCart(intent, lowerText);
      case ChatIntent.viewCart:
        return _handleViewCart();
      case ChatIntent.clearCart:
        return _handleClearCart();
      case ChatIntent.placeOrder:
        return await _handlePlaceOrder();
      case ChatIntent.orderStatus:
        return await _handleOrderStatus();
      case ChatIntent.unknown:
      default:
        return _handleUnknown(text);
    }
  }

  /// Parse user message to determine intent
  ParsedIntent _parseIntent(String text) {
    // Greeting patterns
    if (RegExp(r'^(hi|hello|hey|good morning|good evening|good afternoon)\b').hasMatch(text)) {
      return ParsedIntent(intent: ChatIntent.greet);
    }

    // Help patterns
    if (RegExp(r'\b(help|how do|what can|guide)\b').hasMatch(text)) {
      return ParsedIntent(intent: ChatIntent.help);
    }

    // Order confirmation (yes/no)
    if (RegExp(r'^(yes|yeah|yep|sure|confirm|ok|okay|go ahead|do it)\b').hasMatch(text)) {
      return ParsedIntent(intent: ChatIntent.confirmOrder, isConfirmation: true);
    }

    // Cancel/No
    if (RegExp(r'^(no|nope|cancel|never mind|nevermind)\b').hasMatch(text)) {
      return ParsedIntent(intent: ChatIntent.cancelOrder);
    }

    // Place order / Checkout
    if (RegExp(r'\b(place order|checkout|check out|place my order|order now|complete order|finalize)\b').hasMatch(text)) {
      return ParsedIntent(intent: ChatIntent.placeOrder);
    }

    // Order status
    if (RegExp(r'\b(order status|my orders|track order|where is my order)\b').hasMatch(text)) {
      return ParsedIntent(intent: ChatIntent.orderStatus);
    }

    // View cart
    if (RegExp(r'\b(show cart|view cart|my cart|what.?s in.* cart|cart items|see cart)\b').hasMatch(text)) {
      return ParsedIntent(intent: ChatIntent.viewCart);
    }

    // Clear cart
    if (RegExp(r'\b(clear cart|empty cart|remove all|delete cart)\b').hasMatch(text)) {
      return ParsedIntent(intent: ChatIntent.clearCart);
    }

    // Remove from cart
    if (RegExp(r'\b(remove|delete|take out|take off)\b').hasMatch(text)) {
      final productMatch = RegExp(r'(?:remove|delete|take out|take off)\s+(.+?)(?:\s+from|\s*$)').firstMatch(text);
      return ParsedIntent(
        intent: ChatIntent.removeFromCart,
        productName: productMatch?.group(1)?.trim(),
      );
    }

    // Add to cart patterns
    final addPatterns = [
      RegExp(r'(?:add|order|get|want|i.?ll have|give me)\s+(\d+)?\s*(?:x\s*)?(.+?)(?:\s+to cart|\s+please|\s*$)', caseSensitive: false),
      RegExp(r'^(\d+)\s*(?:x\s*)?(.+)$', caseSensitive: false),
    ];

    for (final pattern in addPatterns) {
      final match = pattern.firstMatch(text);
      if (match != null) {
        final quantityStr = match.group(1);
        final productName = match.group(2)?.trim();
        if (productName != null && productName.isNotEmpty) {
          return ParsedIntent(
            intent: ChatIntent.addToCart,
            productName: productName,
            quantity: int.tryParse(quantityStr ?? '1') ?? 1,
          );
        }
      }
    }

    // Recommendations
    if (RegExp(r'\b(recommend|suggest|what should i|for me|personalized)\b').hasMatch(text)) {
      return ParsedIntent(intent: ChatIntent.showRecommendations);
    }

    // Trending/Popular
    if (RegExp(r'\b(trending|popular|best seller|bestseller|top items|hot items)\b').hasMatch(text)) {
      return ParsedIntent(intent: ChatIntent.showTrending);
    }

    // Show menu
    if (RegExp(r'\b(show menu|see menu|browse menu|full menu|all items|menu please)\b').hasMatch(text)) {
      return ParsedIntent(intent: ChatIntent.showMenu);
    }

    // Search with veg filter
    bool? isVeg;
    if (RegExp(r'\bveg(etarian)?\b').hasMatch(text) && !RegExp(r'\bnon[- ]?veg').hasMatch(text)) {
      isVeg = true;
    } else if (RegExp(r'\bnon[- ]?veg').hasMatch(text)) {
      isVeg = false;
    }

    // Search patterns
    final searchPatterns = [
      RegExp(r'(?:show|find|search|looking for|get|display|list)\s+(.+)', caseSensitive: false),
      RegExp(r'(?:any|got any)\s+(.+)', caseSensitive: false),
      RegExp(r'(?:what|which)\s+(.+)\s+(?:do you have|available)', caseSensitive: false),
    ];

    for (final pattern in searchPatterns) {
      final match = pattern.firstMatch(text);
      if (match != null) {
        var query = match.group(1)?.trim() ?? '';
        // Clean up common words
        query = query.replaceAll(RegExp(r'\b(items?|products?|food|please|me|some)\b'), '').trim();
        if (query.isNotEmpty) {
          return ParsedIntent(
            intent: ChatIntent.searchProducts,
            query: query,
            isVeg: isVeg,
          );
        }
      }
    }

    // Default: treat as search if it contains food-related words
    if (RegExp(r'\b(burger|pizza|fries|drink|coffee|sandwich|salad|chicken|paneer|noodles|rice|biryani|wrap|roll|combo|meal)\b').hasMatch(text)) {
      return ParsedIntent(
        intent: ChatIntent.searchProducts,
        query: text,
        isVeg: isVeg,
      );
    }

    return ParsedIntent(intent: ChatIntent.unknown);
  }

  // Response handlers

  ChatMessage _handleGreeting() {
    return ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      role: MessageRole.assistant,
      content: _userName != null
          ? 'Hello $_userName! How can I help you today? 😊\n\nYou can ask me to show the menu, search for items, or help you place an order.'
          : 'Hello! How can I help you today? 😊',
    );
  }

  ChatMessage _handleHelp() {
    return ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      role: MessageRole.assistant,
      content: 'Here\'s what I can help you with:\n\n'
          '🔍 **Browse & Search**\n'
          '• "show menu" - See all items\n'
          '• "search pizza" - Find specific items\n'
          '• "show veg items" - Filter vegetarian\n'
          '• "trending" - Popular items\n'
          '• "recommend something" - Personalized picks\n\n'
          '🛒 **Cart Management**\n'
          '• "add 2 burgers" - Add items\n'
          '• "show cart" - View cart\n'
          '• "remove pizza" - Remove items\n'
          '• "clear cart" - Empty cart\n\n'
          '📦 **Orders**\n'
          '• "checkout" - Place order\n'
          '• "order status" - Track orders\n\n'
          'Just type naturally and I\'ll understand!',
    );
  }

  Future<ChatMessage> _handleSearch(ParsedIntent intent) async {
    try {
      final response = await ProductService.getProducts(
        search: intent.query,
        isVeg: intent.isVeg,
        limit: 10,
      );

      _lastSearchResults = response.products;

      if (response.products.isEmpty) {
        return ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          role: MessageRole.assistant,
          content: 'Sorry, I couldn\'t find any items matching "${intent.query ?? 'your search'}".\n\n'
              'Try:\n• Different keywords\n• "show menu" to see all items\n• "trending" for popular items',
        );
      }

      final buffer = StringBuffer();
      if (intent.query != null && intent.query!.isNotEmpty) {
        buffer.writeln('Here\'s what I found for "${intent.query}":\n');
      } else {
        buffer.writeln('Here\'s our menu:\n');
      }

      for (var i = 0; i < response.products.length; i++) {
        final product = response.products[i];
        final vegIcon = product.isVeg ? '🟢' : '🔴';
        final priceStr = product.hasActiveDiscount
            ? '~~₹${product.price}~~ ₹${product.effectivePrice}'
            : '₹${product.effectivePrice}';

        buffer.writeln('${i + 1}. $vegIcon **${product.name}** - $priceStr');
        if (product.description != null && product.description!.isNotEmpty) {
          buffer.writeln('   ${product.description}');
        }
        if (!product.isAvailable) {
          buffer.writeln('   ⚠️ Currently unavailable');
        }
        buffer.writeln();
      }

      buffer.writeln('Say "add [item name]" to add to cart!');

      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: buffer.toString(),
        action: ChatAction(
          type: ChatActionType.showProducts,
          payload: ProductSearchResult(
            products: response.products,
            query: intent.query,
          ),
        ),
      );
    } catch (e) {
      debugPrint('Search error: $e');
      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: 'Sorry, I couldn\'t search right now. Please try again.',
      );
    }
  }

  Future<ChatMessage> _handleRecommendations() async {
    try {
      if (_profileId == null) {
        return await _handleTrending();
      }

      final products = await ProductService.getRecommendationsForProfile(_profileId!);
      _lastSearchResults = products;

      if (products.isEmpty) {
        return await _handleTrending();
      }

      final buffer = StringBuffer();
      buffer.writeln('Based on your preferences, I recommend:\n');

      for (var i = 0; i < products.length && i < 5; i++) {
        final product = products[i];
        final vegIcon = product.isVeg ? '🟢' : '🔴';
        buffer.writeln('${i + 1}. $vegIcon **${product.name}** - ₹${product.effectivePrice}');
      }

      buffer.writeln('\nSay "add [item name]" to add to cart!');

      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: buffer.toString(),
        action: ChatAction(
          type: ChatActionType.showProducts,
          payload: ProductSearchResult(products: products),
        ),
      );
    } catch (e) {
      debugPrint('Recommendations error: $e');
      return await _handleTrending();
    }
  }

  Future<ChatMessage> _handleTrending() async {
    try {
      final products = await ProductService.getTrendingProducts();
      _lastSearchResults = products;

      if (products.isEmpty) {
        return ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          role: MessageRole.assistant,
          content: 'No trending items available right now. Try "show menu" to browse all items.',
        );
      }

      final buffer = StringBuffer();
      buffer.writeln('🔥 **Trending Right Now:**\n');

      for (var i = 0; i < products.length && i < 5; i++) {
        final product = products[i];
        final vegIcon = product.isVeg ? '🟢' : '🔴';
        buffer.writeln('${i + 1}. $vegIcon **${product.name}** - ₹${product.effectivePrice}');
      }

      buffer.writeln('\nSay "add [item name]" to add to cart!');

      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: buffer.toString(),
        action: ChatAction(
          type: ChatActionType.showProducts,
          payload: ProductSearchResult(products: products),
        ),
      );
    } catch (e) {
      debugPrint('Trending error: $e');
      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: 'Sorry, couldn\'t load trending items. Try "show menu" instead.',
      );
    }
  }

  Future<ChatMessage> _handleAddToCart(ParsedIntent intent, String originalText) async {
    try {
      final productName = intent.productName?.toLowerCase() ?? '';

      if (productName.isEmpty) {
        return ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          role: MessageRole.assistant,
          content: 'What would you like to add? Try "add burger" or "add 2 pizzas".',
        );
      }

      // First, try to find in last search results
      Product? product;
      for (final p in _lastSearchResults) {
        if (p.name.toLowerCase().contains(productName) ||
            productName.contains(p.name.toLowerCase())) {
          product = p;
          break;
        }
      }

      // If not found, search the API
      if (product == null) {
        final searchResponse = await ProductService.getProducts(
          search: productName,
          limit: 5,
        );

        if (searchResponse.products.isEmpty) {
          return ChatMessage(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            role: MessageRole.assistant,
            content: 'I couldn\'t find "$productName" in our menu.\n\nTry "show menu" to see available items.',
          );
        }

        // Try to find exact or close match
        for (final p in searchResponse.products) {
          if (p.name.toLowerCase().contains(productName) ||
              productName.contains(p.name.toLowerCase())) {
            product = p;
            break;
          }
        }

        // If still no match, use first result
        product ??= searchResponse.products.first;
        _lastSearchResults = searchResponse.products;
      }

      if (!product.isAvailable) {
        return ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          role: MessageRole.assistant,
          content: 'Sorry, **${product.name}** is currently unavailable. 😔\n\nWould you like something else?',
        );
      }

      // Add to cart
      cartService.addToCart(product, quantity: intent.quantity);

      final total = product.effectivePriceValue * intent.quantity;

      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: '✅ Added **${intent.quantity}x ${product.name}** to cart! (₹$total)\n\n'
            '🛒 Cart: ${cartService.itemCount} items • ₹${cartService.totalAmount.toStringAsFixed(0)}\n\n'
            'Say "checkout" when ready, or continue shopping!',
        action: ChatAction(
          type: ChatActionType.addedToCart,
          payload: CartUpdateResult(
            productName: product.name,
            quantity: intent.quantity,
            totalPrice: total,
          ),
        ),
      );
    } catch (e) {
      debugPrint('Add to cart error: $e');
      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: 'Sorry, I couldn\'t add that to your cart. Please try again.',
      );
    }
  }

  Future<ChatMessage> _handleRemoveFromCart(ParsedIntent intent, String originalText) async {
    final productName = intent.productName?.toLowerCase() ?? '';

    if (cartService.items.isEmpty) {
      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: 'Your cart is empty! Nothing to remove.',
      );
    }

    if (productName.isEmpty) {
      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: 'What would you like to remove? Say "remove [item name]".',
      );
    }

    // Find item in cart
    for (final item in cartService.items) {
      if (item.product.name.toLowerCase().contains(productName) ||
          productName.contains(item.product.name.toLowerCase())) {
        final name = item.product.name;
        cartService.removeFromCart(item.product.id);

        return ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          role: MessageRole.assistant,
          content: '🗑️ Removed **$name** from cart.\n\n'
              '🛒 Cart: ${cartService.itemCount} items • ₹${cartService.totalAmount.toStringAsFixed(0)}',
          action: ChatAction(
            type: ChatActionType.removedFromCart,
            payload: name,
          ),
        );
      }
    }

    return ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      role: MessageRole.assistant,
      content: 'I couldn\'t find "$productName" in your cart.\n\nSay "show cart" to see your items.',
    );
  }

  ChatMessage _handleViewCart() {
    if (cartService.items.isEmpty) {
      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: '🛒 Your cart is empty!\n\nSay "show menu" or "trending" to start shopping.',
      );
    }

    final buffer = StringBuffer();
    buffer.writeln('🛒 **Your Cart:**\n');

    for (final item in cartService.items) {
      final vegIcon = item.product.isVeg ? '🟢' : '🔴';
      buffer.writeln('$vegIcon ${item.quantity}x **${item.product.name}** - ₹${item.totalPrice.toStringAsFixed(0)}');
    }

    buffer.writeln('\n───────────────');
    buffer.writeln('**Total: ₹${cartService.totalAmount.toStringAsFixed(0)}**');
    buffer.writeln('\nSay "checkout" to place order, or "clear cart" to start over.');

    return ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      role: MessageRole.assistant,
      content: buffer.toString(),
    );
  }

  ChatMessage _handleClearCart() {
    if (cartService.items.isEmpty) {
      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: 'Your cart is already empty!',
      );
    }

    cartService.clearCart();
    return ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      role: MessageRole.assistant,
      content: '🗑️ Cart cleared!\n\nReady to start fresh. What would you like to order?',
    );
  }

  Future<ChatMessage> _handlePlaceOrder() async {
    if (cartService.items.isEmpty) {
      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: '🛒 Your cart is empty!\n\nAdd some items first, then say "checkout".',
      );
    }

    // Show order summary and ask for confirmation
    _awaitingOrderConfirmation = true;

    final buffer = StringBuffer();
    buffer.writeln('📋 **Order Summary:**\n');

    for (final item in cartService.items) {
      final vegIcon = item.product.isVeg ? '🟢' : '🔴';
      buffer.writeln('$vegIcon ${item.quantity}x ${item.product.name} - ₹${item.totalPrice.toStringAsFixed(0)}');
    }

    buffer.writeln('\n───────────────');
    buffer.writeln('**Total: ₹${cartService.totalAmount.toStringAsFixed(0)}**\n');
    buffer.writeln('Say **"yes"** to confirm or **"no"** to cancel.');

    return ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      role: MessageRole.assistant,
      content: buffer.toString(),
    );
  }

  Future<ChatMessage> _handleOrderConfirmation(String text) async {
    _awaitingOrderConfirmation = false;

    if (RegExp(r'^(yes|yeah|yep|sure|confirm|ok|okay|go ahead|do it)\b').hasMatch(text)) {
      // Place the order
      try {
        final orderItems = cartService.items.map((item) => CreateOrderItemRequest(
          productId: item.product.id,
          quantity: item.quantity,
        )).toList();

        final request = CreateOrderRequest(
          customerName: _userName ?? 'Guest',
          profileId: _profileId,
          items: orderItems,
        );

        final order = await OrderService.createOrder(request);

        // Clear cart after successful order
        cartService.clearCart();

        // Refresh orders in the state manager
        if (_profileId != null) {
          orderStateManager.loadOrders(_profileId);
        }

        return ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          role: MessageRole.assistant,
          content: '🎉 **Order Placed Successfully!**\n\n'
              '📝 Order #${order.orderNumber}\n'
              '💰 Total: ₹${order.grandTotalValue.toStringAsFixed(0)}\n'
              '📊 Status: ${order.status.displayName}\n\n'
              'Thank you for your order! Is there anything else I can help you with?',
          action: ChatAction(
            type: ChatActionType.orderPlaced,
            payload: OrderPlacedResult(
              orderId: order.id,
              orderNumber: order.orderNumber,
              total: order.grandTotalValue,
            ),
          ),
        );
      } catch (e) {
        debugPrint('Order error: $e');
        return ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          role: MessageRole.assistant,
          content: '❌ Sorry, there was an error placing your order.\n\nPlease try again or contact support.',
        );
      }
    } else {
      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: '👍 Order cancelled. Your cart is still saved.\n\nLet me know when you\'re ready to checkout!',
      );
    }
  }

  Future<ChatMessage> _handleOrderStatus() async {
    if (_profileId == null) {
      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: 'Please sign in to view your order history.',
      );
    }

    try {
      final response = await OrderService.getOrdersByProfile(_profileId!, limit: 5);

      if (response.orders.isEmpty) {
        return ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          role: MessageRole.assistant,
          content: 'You don\'t have any orders yet.\n\nSay "show menu" to start ordering!',
        );
      }

      final buffer = StringBuffer();
      buffer.writeln('📦 **Your Recent Orders:**\n');

      for (final order in response.orders) {
        final statusEmoji = _getStatusEmoji(order.status);
        buffer.writeln('$statusEmoji #${order.orderNumber}');
        buffer.writeln('   ₹${order.grandTotalValue.toStringAsFixed(0)} • ${order.status.displayName}');
        buffer.writeln();
      }

      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: buffer.toString(),
        action: ChatAction(
          type: ChatActionType.orderStatus,
          payload: response.orders,
        ),
      );
    } catch (e) {
      debugPrint('Order status error: $e');
      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: MessageRole.assistant,
        content: 'Sorry, I couldn\'t fetch your orders. Please try again.',
      );
    }
  }

  String _getStatusEmoji(OrderStatus status) {
    switch (status) {
      case OrderStatus.pending:
        return '⏳';
      case OrderStatus.confirmed:
        return '✅';
      case OrderStatus.preparing:
        return '👨‍🍳';
      case OrderStatus.ready:
        return '🔔';
      case OrderStatus.completed:
        return '✨';
      case OrderStatus.cancelled:
        return '❌';
    }
  }

  ChatMessage _handleUnknown(String text) {
    return ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      role: MessageRole.assistant,
      content: 'I\'m not sure what you mean by "$text".\n\n'
          'Try:\n'
          '• "show menu" - Browse items\n'
          '• "search [item]" - Find specific items\n'
          '• "add [item]" - Add to cart\n'
          '• "checkout" - Place order\n'
          '• "help" - See all commands',
    );
  }
}

// Global instance
final chatService = ChatService();
