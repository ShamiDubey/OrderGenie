import 'package:ai_dashboard_frontend/models/product.dart';

enum MessageRole { user, assistant, system }

enum ChatActionType {
  showProducts,
  addedToCart,
  removedFromCart,
  orderPlaced,
  orderStatus,
}

class ChatMessage {
  final String id;
  final MessageRole role;
  final String content;
  final DateTime timestamp;
  final ChatAction? action;
  final bool isLoading;

  ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    DateTime? timestamp,
    this.action,
    this.isLoading = false,
  }) : timestamp = timestamp ?? DateTime.now();

  ChatMessage copyWith({
    String? id,
    MessageRole? role,
    String? content,
    DateTime? timestamp,
    ChatAction? action,
    bool? isLoading,
  }) {
    return ChatMessage(
      id: id ?? this.id,
      role: role ?? this.role,
      content: content ?? this.content,
      timestamp: timestamp ?? this.timestamp,
      action: action ?? this.action,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class ChatAction {
  final ChatActionType type;
  final dynamic payload;

  ChatAction({
    required this.type,
    this.payload,
  });
}

class ProductSearchResult {
  final List<Product> products;
  final String? query;

  ProductSearchResult({
    required this.products,
    this.query,
  });
}

class CartUpdateResult {
  final String productName;
  final int quantity;
  final double totalPrice;

  CartUpdateResult({
    required this.productName,
    required this.quantity,
    required this.totalPrice,
  });
}

class OrderPlacedResult {
  final String orderId;
  final String orderNumber;
  final double total;

  OrderPlacedResult({
    required this.orderId,
    required this.orderNumber,
    required this.total,
  });
}
