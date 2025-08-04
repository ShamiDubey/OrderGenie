import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:http/http.dart' as http;
import 'package:ai_dashboard_frontend/config/api_config.dart';
import 'package:ai_dashboard_frontend/models/product.dart';
import 'package:ai_dashboard_frontend/models/order.dart';

class AdminService {
  static const String _adminToken = '123';

  static Map<String, String> get _adminHeaders => {
        ...ApiConfig.headers,
        'x-admin-token': _adminToken,
      };

  // ==================== PRODUCTS ====================

  /// Create a new product
  static Future<Product> createProduct({
    required String name,
    required double price,
    String? description,
    bool isVeg = true,
    String? tags,
    String? categoryId,
    double? discountedPrice,
    DateTime? discountEnds,
    int? preparationTime,
    int? calories,
    String? servingSize,
    bool isFeatured = false,
    File? image,
  }) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/products');
      final request = http.MultipartRequest('POST', uri);

      request.headers['x-admin-token'] = _adminToken;

      request.fields['name'] = name;
      request.fields['price'] = price.toString();
      if (description != null) request.fields['description'] = description;
      request.fields['isVeg'] = isVeg.toString();
      if (tags != null) request.fields['tags'] = tags;
      if (categoryId != null) request.fields['categoryId'] = categoryId;
      if (discountedPrice != null) {
        request.fields['discountedPrice'] = discountedPrice.toString();
      }
      if (discountEnds != null) {
        request.fields['discountEnds'] = discountEnds.toIso8601String();
      }
      if (preparationTime != null) {
        request.fields['preparationTime'] = preparationTime.toString();
      }
      if (calories != null) request.fields['calories'] = calories.toString();
      if (servingSize != null) request.fields['servingSize'] = servingSize;
      request.fields['isFeatured'] = isFeatured.toString();

      if (image != null) {
        request.files.add(await http.MultipartFile.fromPath('image', image.path));
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      final data = jsonDecode(response.body);

      if (response.statusCode == 201 || response.statusCode == 200) {
        if (data['success'] == true && data['data'] != null) {
          return Product.fromJson(data['data']);
        }
      }
      throw Exception(data['error'] ?? 'Failed to create product');
    } catch (e) {
      debugPrint('Error creating product: $e');
      rethrow;
    }
  }

  /// Update an existing product
  static Future<Product> updateProduct({
    required String productId,
    String? name,
    double? price,
    String? description,
    bool? isVeg,
    String? tags,
    String? categoryId,
    double? discountedPrice,
    DateTime? discountEnds,
    int? preparationTime,
    int? calories,
    String? servingSize,
    bool? isFeatured,
    File? image,
  }) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/products/$productId');
      final request = http.MultipartRequest('PUT', uri);

      request.headers['x-admin-token'] = _adminToken;

      if (name != null) request.fields['name'] = name;
      if (price != null) request.fields['price'] = price.toString();
      if (description != null) request.fields['description'] = description;
      if (isVeg != null) request.fields['isVeg'] = isVeg.toString();
      if (tags != null) request.fields['tags'] = tags;
      if (categoryId != null) request.fields['categoryId'] = categoryId;
      if (discountedPrice != null) {
        request.fields['discountedPrice'] = discountedPrice.toString();
      }
      if (discountEnds != null) {
        request.fields['discountEnds'] = discountEnds.toIso8601String();
      }
      if (preparationTime != null) {
        request.fields['preparationTime'] = preparationTime.toString();
      }
      if (calories != null) request.fields['calories'] = calories.toString();
      if (servingSize != null) request.fields['servingSize'] = servingSize;
      if (isFeatured != null) request.fields['isFeatured'] = isFeatured.toString();

      if (image != null) {
        request.files.add(await http.MultipartFile.fromPath('image', image.path));
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        if (data['success'] == true && data['data'] != null) {
          return Product.fromJson(data['data']);
        }
      }
      throw Exception(data['error'] ?? 'Failed to update product');
    } catch (e) {
      debugPrint('Error updating product: $e');
      rethrow;
    }
  }

  /// Toggle product availability
  static Future<Product> toggleProductAvailability(
      String productId, bool isAvailable) async {
    try {
      final response = await http.patch(
        Uri.parse('${ApiConfig.baseUrl}/api/products/$productId/availability'),
        headers: _adminHeaders,
        body: jsonEncode({'isAvailable': isAvailable}),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        if (data['success'] == true && data['data'] != null) {
          return Product.fromJson(data['data']);
        }
      }
      throw Exception(data['error'] ?? 'Failed to toggle availability');
    } catch (e) {
      debugPrint('Error toggling availability: $e');
      rethrow;
    }
  }

  /// Delete a product
  static Future<void> deleteProduct(String productId) async {
    try {
      final response = await http.delete(
        Uri.parse('${ApiConfig.baseUrl}/api/products/$productId'),
        headers: _adminHeaders,
      );

      if (response.statusCode != 200 && response.statusCode != 204) {
        final data = jsonDecode(response.body);
        throw Exception(data['error'] ?? 'Failed to delete product');
      }
    } catch (e) {
      debugPrint('Error deleting product: $e');
      rethrow;
    }
  }

  // ==================== CATEGORIES ====================

  /// Create a new category
  static Future<Category> createCategory({
    required String name,
    String? description,
    int? displayOrder,
    File? image,
  }) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/categories');
      final request = http.MultipartRequest('POST', uri);

      request.headers['x-admin-token'] = _adminToken;

      request.fields['name'] = name;
      if (description != null) request.fields['description'] = description;
      if (displayOrder != null) {
        request.fields['displayOrder'] = displayOrder.toString();
      }

      if (image != null) {
        request.files.add(await http.MultipartFile.fromPath('image', image.path));
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      final data = jsonDecode(response.body);

      if (response.statusCode == 201 || response.statusCode == 200) {
        if (data['success'] == true && data['data'] != null) {
          return Category.fromJson(data['data']);
        }
      }
      throw Exception(data['error'] ?? 'Failed to create category');
    } catch (e) {
      debugPrint('Error creating category: $e');
      rethrow;
    }
  }

  /// Update a category
  static Future<Category> updateCategory({
    required String categoryId,
    String? name,
    String? description,
    int? displayOrder,
    File? image,
  }) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/categories/$categoryId');
      final request = http.MultipartRequest('PUT', uri);

      request.headers['x-admin-token'] = _adminToken;

      if (name != null) request.fields['name'] = name;
      if (description != null) request.fields['description'] = description;
      if (displayOrder != null) {
        request.fields['displayOrder'] = displayOrder.toString();
      }

      if (image != null) {
        request.files.add(await http.MultipartFile.fromPath('image', image.path));
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        if (data['success'] == true && data['data'] != null) {
          return Category.fromJson(data['data']);
        }
      }
      throw Exception(data['error'] ?? 'Failed to update category');
    } catch (e) {
      debugPrint('Error updating category: $e');
      rethrow;
    }
  }

  /// Delete a category
  static Future<void> deleteCategory(String categoryId) async {
    try {
      final response = await http.delete(
        Uri.parse('${ApiConfig.baseUrl}/api/categories/$categoryId'),
        headers: _adminHeaders,
      );

      if (response.statusCode != 200 && response.statusCode != 204) {
        final data = jsonDecode(response.body);
        throw Exception(data['error'] ?? 'Failed to delete category');
      }
    } catch (e) {
      debugPrint('Error deleting category: $e');
      rethrow;
    }
  }

  // ==================== ORDERS ====================

  /// Get all orders (admin)
  static Future<OrdersResponse> getAllOrders({
    OrderStatus? status,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final queryParams = <String, String>{
        'page': page.toString(),
        'limit': limit.toString(),
      };
      if (status != null) {
        queryParams['status'] = status.name;
      }

      final uri = Uri.parse('${ApiConfig.baseUrl}/api/orders')
          .replace(queryParameters: queryParams);

      final response = await http.get(uri, headers: _adminHeaders);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return OrdersResponse.fromJson(data);
        }
      }
      return OrdersResponse(orders: [], pagination: null);
    } catch (e) {
      debugPrint('Error getting all orders: $e');
      return OrdersResponse(orders: [], pagination: null);
    }
  }

  /// Update order status
  static Future<Order> updateOrderStatus(
      String orderId, OrderStatus status) async {
    try {
      final response = await http.patch(
        Uri.parse('${ApiConfig.baseUrl}/api/orders/$orderId/status'),
        headers: _adminHeaders,
        body: jsonEncode({'status': status.name}),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        if (data['success'] == true && data['data'] != null) {
          return Order.fromJson(data['data']);
        }
      }
      throw Exception(data['error'] ?? 'Failed to update order status');
    } catch (e) {
      debugPrint('Error updating order status: $e');
      rethrow;
    }
  }

  // ==================== ANALYTICS ====================

  /// Get top products analytics
  static Future<List<TopProductAnalytics>> getTopProducts({int limit = 10}) async {
    try {
      final uri = Uri.parse(
              '${ApiConfig.baseUrl}/api/orders/analytics/top-products')
          .replace(queryParameters: {'limit': limit.toString()});

      final response = await http.get(uri, headers: _adminHeaders);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null) {
          return (data['data'] as List)
              .map((item) => TopProductAnalytics.fromJson(item))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error getting top products: $e');
      return [];
    }
  }

  /// Get profile favorites analytics
  static Future<ProfileAnalytics?> getProfileAnalytics(String profileId) async {
    try {
      final response = await http.get(
        Uri.parse(
            '${ApiConfig.baseUrl}/api/orders/analytics/profile/$profileId'),
        headers: _adminHeaders,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null) {
          return ProfileAnalytics.fromJson(data['data']);
        }
      }
      return null;
    } catch (e) {
      debugPrint('Error getting profile analytics: $e');
      return null;
    }
  }
}

// Analytics models
class TopProductAnalytics {
  final String productId;
  final String productName;
  final int totalQuantity;
  final double totalRevenue;

  TopProductAnalytics({
    required this.productId,
    required this.productName,
    required this.totalQuantity,
    required this.totalRevenue,
  });

  factory TopProductAnalytics.fromJson(Map<String, dynamic> json) {
    return TopProductAnalytics(
      productId: json['productId'] ?? json['product_id'] ?? '',
      productName: json['productName'] ?? json['product_name'] ?? '',
      totalQuantity: json['totalQuantity'] ?? json['total_quantity'] ?? 0,
      totalRevenue: (json['totalRevenue'] ?? json['total_revenue'] ?? 0).toDouble(),
    );
  }
}

class ProfileAnalytics {
  final String profileId;
  final int totalOrders;
  final double totalSpent;
  final List<FavoriteProduct> favoriteProducts;

  ProfileAnalytics({
    required this.profileId,
    required this.totalOrders,
    required this.totalSpent,
    required this.favoriteProducts,
  });

  factory ProfileAnalytics.fromJson(Map<String, dynamic> json) {
    return ProfileAnalytics(
      profileId: json['profileId'] ?? json['profile_id'] ?? '',
      totalOrders: json['totalOrders'] ?? json['total_orders'] ?? 0,
      totalSpent: (json['totalSpent'] ?? json['total_spent'] ?? 0).toDouble(),
      favoriteProducts: (json['favoriteProducts'] ?? json['favorite_products'] ?? [])
          .map<FavoriteProduct>((item) => FavoriteProduct.fromJson(item))
          .toList(),
    );
  }
}

class FavoriteProduct {
  final String productId;
  final String productName;
  final int orderCount;

  FavoriteProduct({
    required this.productId,
    required this.productName,
    required this.orderCount,
  });

  factory FavoriteProduct.fromJson(Map<String, dynamic> json) {
    return FavoriteProduct(
      productId: json['productId'] ?? json['product_id'] ?? '',
      productName: json['productName'] ?? json['product_name'] ?? '',
      orderCount: json['orderCount'] ?? json['order_count'] ?? 0,
    );
  }
}
