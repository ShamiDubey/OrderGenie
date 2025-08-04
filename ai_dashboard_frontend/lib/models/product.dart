class Product {
  final String id;
  final String name;
  final String slug;
  final String? description;
  final String price;
  final String? discountedPrice;
  final DateTime? discountEnds;
  final bool isVeg;
  final List<String> tags;
  final String? imageUrl;
  final String? imagePublicId;
  final String? thumbnailUrl;
  final String categoryId;
  final bool isAvailable;
  final bool isFeatured;
  final int displayOrder;
  final int? preparationTime;
  final int? calories;
  final String? servingSize;
  final int royaltyPoints;
  final DateTime createdAt;
  final DateTime updatedAt;
  final Category? category;
  final String effectivePrice;
  final bool hasActiveDiscount;

  Product({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    required this.price,
    this.discountedPrice,
    this.discountEnds,
    required this.isVeg,
    this.tags = const [],
    this.imageUrl,
    this.imagePublicId,
    this.thumbnailUrl,
    required this.categoryId,
    required this.isAvailable,
    required this.isFeatured,
    required this.displayOrder,
    this.preparationTime,
    this.calories,
    this.servingSize,
    required this.royaltyPoints,
    required this.createdAt,
    required this.updatedAt,
    this.category,
    required this.effectivePrice,
    required this.hasActiveDiscount,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      description: json['description'],
      price: json['price']?.toString() ?? '0',
      discountedPrice: json['discountedPrice']?.toString(),
      discountEnds: json['discountEnds'] != null
          ? DateTime.tryParse(json['discountEnds'])
          : null,
      isVeg: json['isVeg'] ?? false,
      tags: json['tags'] != null ? List<String>.from(json['tags']) : [],
      imageUrl: json['imageUrl'],
      imagePublicId: json['imagePublicId'],
      thumbnailUrl: json['thumbnailUrl'],
      categoryId: json['categoryId'] ?? '',
      isAvailable: json['isAvailable'] ?? true,
      isFeatured: json['isFeatured'] ?? false,
      displayOrder: json['displayOrder'] ?? 0,
      preparationTime: json['preparationTime'],
      calories: json['calories'],
      servingSize: json['servingSize'],
      royaltyPoints: json['royaltyPoints'] ?? 0,
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] ?? '') ?? DateTime.now(),
      category: json['category'] != null
          ? Category.fromJson(json['category'])
          : null,
      effectivePrice: json['effectivePrice']?.toString() ?? json['price']?.toString() ?? '0',
      hasActiveDiscount: json['hasActiveDiscount'] ?? false,
    );
  }

  /// Returns the effective price as a double for calculations
  double get effectivePriceValue => double.tryParse(effectivePrice) ?? 0;

  /// Returns the original price as a double for calculations
  double get priceValue => double.tryParse(price) ?? 0;

  /// Returns the discount percentage if there's an active discount
  int get discountPercentage {
    if (!hasActiveDiscount || discountedPrice == null) return 0;
    final original = priceValue;
    final discounted = double.tryParse(discountedPrice!) ?? original;
    if (original <= 0) return 0;
    return ((original - discounted) / original * 100).round();
  }
}

class ProductsResponse {
  final bool success;
  final List<Product> products;
  final PaginationInfo? pagination;
  final String? message;

  ProductsResponse({
    required this.success,
    required this.products,
    this.pagination,
    this.message,
  });

  factory ProductsResponse.fromJson(Map<String, dynamic> json) {
    final productsJson = json['data'] ?? [];
    return ProductsResponse(
      success: json['success'] ?? true,
      products: (productsJson as List)
          .map((p) => Product.fromJson(p))
          .toList(),
      pagination: json['pagination'] != null
          ? PaginationInfo.fromJson(json['pagination'])
          : null,
      message: json['message'],
    );
  }
}

class PaginationInfo {
  final int page;
  final int limit;
  final int total;
  final int totalPages;
  final bool hasNext;
  final bool hasPrev;

  PaginationInfo({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
    required this.hasNext,
    required this.hasPrev,
  });

  factory PaginationInfo.fromJson(Map<String, dynamic> json) {
    return PaginationInfo(
      page: json['page'] ?? 1,
      limit: json['limit'] ?? 20,
      total: json['total'] ?? 0,
      totalPages: json['totalPages'] ?? 1,
      hasNext: json['hasNext'] ?? false,
      hasPrev: json['hasPrev'] ?? false,
    );
  }
}

class Category {
  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? imageUrl;
  final int displayOrder;
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final int productCount;

  Category({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.imageUrl,
    this.displayOrder = 0,
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
    this.productCount = 0,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      description: json['description'],
      imageUrl: json['imageUrl'],
      displayOrder: json['displayOrder'] ?? 0,
      isActive: json['isActive'] ?? true,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'])
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'])
          : null,
      productCount: json['_count']?['products'] ?? 0,
    );
  }
}
