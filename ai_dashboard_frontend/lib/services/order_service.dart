import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:ai_dashboard_frontend/config/api_config.dart';
import 'package:ai_dashboard_frontend/models/order.dart';

/// Global order state manager
class OrderStateManager extends ChangeNotifier {
  List<Order> _orders = [];
  bool _isLoading = false;
  String? _error;
  String? _currentProfileId;

  List<Order> get orders => _orders;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Get active orders (pending, confirmed, preparing, ready)
  List<Order> get activeOrders {
    const activeStatuses = [
      OrderStatus.pending,
      OrderStatus.confirmed,
      OrderStatus.preparing,
      OrderStatus.ready,
    ];
    return _orders.where((order) => activeStatuses.contains(order.status)).toList();
  }

  /// Load orders for a profile
  Future<void> loadOrders(String? profileId) async {
    if (profileId == null) {
      _orders = [];
      notifyListeners();
      return;
    }

    _currentProfileId = profileId;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await OrderService.getOrdersByProfile(profileId);
      _orders = response.orders;
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Refresh orders using the current profile ID
  Future<void> refreshOrders() async {
    if (_currentProfileId != null) {
      await loadOrders(_currentProfileId);
    }
  }

  /// Clear all orders
  void clearOrders() {
    _orders = [];
    _currentProfileId = null;
    _error = null;
    notifyListeners();
  }
}

/// Global instance of order state manager
final orderStateManager = OrderStateManager();

class OrderService {
  /// Create a new order
  static Future<Order> createOrder(CreateOrderRequest request) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/orders'),
        headers: ApiConfig.headers,
        body: jsonEncode(request.toJson()),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 201 || response.statusCode == 200) {
        if (data['success'] == true && data['data'] != null) {
          return Order.fromJson(data['data'] as Map<String, dynamic>);
        }
        throw Exception(data['error'] ?? 'Failed to create order');
      } else {
        throw Exception(data['error'] ?? 'Failed to create order: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Error creating order: $e');
      rethrow;
    }
  }

  /// Get order by ID
  static Future<Order?> getOrderById(String orderId) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/orders/$orderId'),
        headers: ApiConfig.headers,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null) {
          return Order.fromJson(data['data'] as Map<String, dynamic>);
        }
      }
      return null;
    } catch (e) {
      debugPrint('Error getting order by ID: $e');
      return null;
    }
  }

  /// Get order by order number
  static Future<Order?> getOrderByNumber(String orderNumber) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/orders/number/$orderNumber'),
        headers: ApiConfig.headers,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null) {
          return Order.fromJson(data['data'] as Map<String, dynamic>);
        }
      }
      return null;
    } catch (e) {
      debugPrint('Error getting order by number: $e');
      return null;
    }
  }

  /// Get order history by profile ID
  static Future<OrdersResponse> getOrdersByProfile(
    String profileId, {
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final queryParams = {
        'page': page.toString(),
        'limit': limit.toString(),
      };

      final uri = Uri.parse('${ApiConfig.baseUrl}/api/orders/profile/$profileId')
          .replace(queryParameters: queryParams);

      final response = await http.get(uri, headers: ApiConfig.headers);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return OrdersResponse.fromJson(data);
        }
      }
      return OrdersResponse(orders: [], pagination: null);
    } catch (e) {
      debugPrint('Error getting orders by profile: $e');
      return OrdersResponse(orders: [], pagination: null);
    }
  }

  /// Cancel an order (only works if status is PENDING)
  static Future<Order?> cancelOrder(String orderId) async {
    try {
      final response = await http.patch(
        Uri.parse('${ApiConfig.baseUrl}/api/orders/$orderId/cancel'),
        headers: ApiConfig.headers,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null) {
          return Order.fromJson(data['data'] as Map<String, dynamic>);
        }
      }
      return null;
    } catch (e) {
      debugPrint('Error cancelling order: $e');
      return null;
    }
  }
}
