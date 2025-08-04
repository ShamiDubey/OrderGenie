import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:ai_dashboard_frontend/config/api_config.dart';
import 'package:ai_dashboard_frontend/models/product.dart';

class ProductService {
  static String get _baseUrl => ApiConfig.baseUrl;

  /// Fetches products with optional filtering and pagination.
  ///
  /// [isVeg] - Filter for vegetarian products only
  /// [category] - Filter by category UUID
  /// [tags] - Filter by tags (e.g., "spicy")
  /// [search] - Search term for product name/description
  /// [page] - Page number (default: 1)
  /// [limit] - Items per page (default: 20)
  static Future<ProductsResponse> getProducts({
    bool? isVeg,
    String? category,
    String? tags,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, String>{};

    if (isVeg != null) {
      queryParams['isVeg'] = isVeg.toString();
    }
    if (category != null && category.isNotEmpty) {
      queryParams['category'] = category;
    }
    if (tags != null && tags.isNotEmpty) {
      queryParams['tags'] = tags;
    }
    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }
    queryParams['page'] = page.toString();
    queryParams['limit'] = limit.toString();

    final uri = Uri.parse('$_baseUrl/api/products').replace(
      queryParameters: queryParams,
    );

    final response = await http.get(uri, headers: ApiConfig.headers);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final Map<String, dynamic> body = json.decode(response.body);
      return ProductsResponse.fromJson(body);
    } else {
      throw Exception(
        'Failed to fetch products: ${response.statusCode} ${response.reasonPhrase}',
      );
    }
  }

  /// Fetches all available categories
  static Future<List<Category>> getCategories() async {
    final uri = Uri.parse('$_baseUrl/api/categories');

    final response = await http.get(uri, headers: ApiConfig.headers);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final body = json.decode(response.body);
      final categoriesJson = body['data'] ?? body['categories'] ?? body;
      if (categoriesJson is List) {
        return categoriesJson.map((c) => Category.fromJson(c)).toList();
      }
      return [];
    } else {
      throw Exception(
        'Failed to fetch categories: ${response.statusCode} ${response.reasonPhrase}',
      );
    }
  }

  /// Fetches featured products
  static Future<List<Product>> getFeaturedProducts() async {
    final uri = Uri.parse('$_baseUrl/api/products/featured');

    final response = await http.get(uri, headers: ApiConfig.headers);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final body = json.decode(response.body);
      final productsJson = body['data'] ?? body['products'] ?? [];
      if (productsJson is List) {
        return productsJson.map((p) => Product.fromJson(p)).toList();
      }
      return [];
    } else {
      throw Exception(
        'Failed to fetch featured products: ${response.statusCode} ${response.reasonPhrase}',
      );
    }
  }

  /// Fetches globally trending products
  static Future<List<Product>> getTrendingProducts() async {
    final uri = Uri.parse('$_baseUrl/api/recommendations/trending');

    final response = await http.get(uri, headers: ApiConfig.headers);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final body = json.decode(response.body);
      final data = body['data'];
      List<dynamic> productsJson = [];

      if (data is Map && data['products'] is List) {
        productsJson = data['products'];
      } else if (data is List) {
        productsJson = data;
      } else if (body['products'] is List) {
        productsJson = body['products'];
      }

      // Convert snake_case to camelCase for each product
      return productsJson.map((p) {
        return Product.fromJson(_convertSnakeToCamel(p));
      }).toList();
    } else {
      throw Exception(
        'Failed to fetch trending products: ${response.statusCode} ${response.reasonPhrase}',
      );
    }
  }

  /// Fetches personalized recommendations for a user profile
  static Future<List<Product>> getRecommendationsForProfile(String profileId) async {
    final uri = Uri.parse('$_baseUrl/api/recommendations/profile/$profileId');

    final response = await http.get(uri, headers: ApiConfig.headers);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final body = json.decode(response.body);
      final data = body['data'];
      List<dynamic> productsJson = [];

      // Handle personalized recommendations format: { recommendations: [{ product: {...}, score, reason }] }
      if (data is Map && data['recommendations'] is List) {
        final recommendations = data['recommendations'] as List;
        productsJson = recommendations.map((r) {
          // Each recommendation has a 'product' key containing the actual product
          if (r is Map && r['product'] is Map) {
            return r['product'];
          }
          return r;
        }).toList();
      } else if (data is Map && data['products'] is List) {
        productsJson = data['products'];
      } else if (data is List) {
        productsJson = data;
      } else if (body['products'] is List) {
        productsJson = body['products'];
      } else if (body['recommendations'] is List) {
        productsJson = body['recommendations'];
      }

      // Convert snake_case to camelCase for each product
      return productsJson.map((p) {
        return Product.fromJson(_convertSnakeToCamel(p));
      }).toList();
    } else {
      throw Exception(
        'Failed to fetch recommendations: ${response.statusCode} ${response.reasonPhrase}',
      );
    }
  }

  /// Fetches a single product by ID
  static Future<Product> getProductById(String productId) async {
    final uri = Uri.parse('$_baseUrl/api/products/$productId');

    final response = await http.get(uri, headers: ApiConfig.headers);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final body = json.decode(response.body);
      final productJson = body['data'] ?? body;
      return Product.fromJson(productJson);
    } else {
      throw Exception(
        'Failed to fetch product: ${response.statusCode} ${response.reasonPhrase}',
      );
    }
  }

  /// Fetches similar products for a given product ID
  static Future<List<Product>> getSimilarProducts(String productId) async {
    final uri = Uri.parse('$_baseUrl/api/recommendations/product/$productId/similar');

    final response = await http.get(uri, headers: ApiConfig.headers);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final body = json.decode(response.body);
      final data = body['data'];
      if (data != null && data['products'] is List) {
        // Handle snake_case response from recommendations API
        return (data['products'] as List).map((p) {
          return Product.fromJson(_convertSnakeToCamel(p));
        }).toList();
      }
      return [];
    } else {
      throw Exception(
        'Failed to fetch similar products: ${response.statusCode} ${response.reasonPhrase}',
      );
    }
  }

  /// Converts snake_case keys to camelCase for Product parsing
  static Map<String, dynamic> _convertSnakeToCamel(Map<String, dynamic> map) {
    final result = <String, dynamic>{};
    map.forEach((key, value) {
      final camelKey = key.replaceAllMapped(
        RegExp(r'_([a-z])'),
        (match) => match.group(1)!.toUpperCase(),
      );
      result[camelKey] = value;
    });

    // Map specific fields that have different names
    if (result.containsKey('categoryName') && !result.containsKey('category')) {
      result['category'] = {
        'id': result['categoryId'],
        'name': result['categoryName'],
        'slug': result['categorySlug'],
      };
    }

    return result;
  }
}
