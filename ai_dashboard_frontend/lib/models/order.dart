import 'package:flutter/material.dart';

class OrderItem {
  final String id;
  final String orderId;
  final String? productId;
  final String productName;
  final String productSlug;
  final int quantity;
  final String unitPrice;
  final String? discountedPrice;
  final String effectivePrice;
  final String lineTotal;
  final bool isVeg;
  final String categoryName;
  final int royaltyPoints;
  final DateTime createdAt;

  OrderItem({
    required this.id,
    required this.orderId,
    this.productId,
    required this.productName,
    required this.productSlug,
    required this.quantity,
    required this.unitPrice,
    this.discountedPrice,
    required this.effectivePrice,
    required this.lineTotal,
    required this.isVeg,
    required this.categoryName,
    required this.royaltyPoints,
    required this.createdAt,
  });

  double get unitPriceValue => double.tryParse(unitPrice) ?? 0;
  double get effectivePriceValue => double.tryParse(effectivePrice) ?? 0;
  double get lineTotalValue => double.tryParse(lineTotal) ?? 0;

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'] as String? ?? '',
      orderId: json['orderId'] as String? ?? '',
      productId: json['productId'] as String?,
      productName: json['productName'] as String? ?? 'Unknown Item',
      productSlug: json['productSlug'] as String? ?? '',
      quantity: json['quantity'] as int? ?? 1,
      unitPrice: json['unitPrice']?.toString() ?? '0',
      discountedPrice: json['discountedPrice']?.toString(),
      effectivePrice: json['effectivePrice']?.toString() ?? '0',
      lineTotal: json['lineTotal']?.toString() ?? '0',
      isVeg: json['isVeg'] as bool? ?? true,
      categoryName: json['categoryName'] as String? ?? '',
      royaltyPoints: json['royaltyPoints'] as int? ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderId': orderId,
      'productId': productId,
      'productName': productName,
      'productSlug': productSlug,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'discountedPrice': discountedPrice,
      'effectivePrice': effectivePrice,
      'lineTotal': lineTotal,
      'isVeg': isVeg,
      'categoryName': categoryName,
      'royaltyPoints': royaltyPoints,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

enum OrderStatus {
  pending('PENDING'),
  confirmed('CONFIRMED'),
  preparing('PREPARING'),
  ready('READY'),
  completed('COMPLETED'),
  cancelled('CANCELLED');

  final String value;
  const OrderStatus(this.value);

  String get displayName {
    switch (this) {
      case OrderStatus.pending:
        return 'Pending';
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

  static OrderStatus fromString(String status) {
    return OrderStatus.values.firstWhere(
      (e) => e.value == status,
      orElse: () => OrderStatus.pending,
    );
  }
}

class Order {
  final String id;
  final String orderNumber;
  final String? profileId;
  final String customerName;
  final String? customerEmail;
  final String? customerPhone;
  final OrderStatus status;
  final OrderType orderType;
  final String? paymentMethod;
  final String? notes;
  final String subtotal;
  final String discountTotal;
  final String taxAmount;
  final String grandTotal;
  final int pointsEarned;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? confirmedAt;
  final DateTime? completedAt;
  final DateTime? cancelledAt;
  final List<OrderItem> items;

  Order({
    required this.id,
    required this.orderNumber,
    this.profileId,
    required this.customerName,
    this.customerEmail,
    this.customerPhone,
    required this.status,
    this.orderType = OrderType.dineIn,
    this.paymentMethod,
    this.notes,
    required this.subtotal,
    required this.discountTotal,
    required this.taxAmount,
    required this.grandTotal,
    required this.pointsEarned,
    required this.createdAt,
    required this.updatedAt,
    this.confirmedAt,
    this.completedAt,
    this.cancelledAt,
    required this.items,
  });

  double get subtotalValue => double.tryParse(subtotal) ?? 0;
  double get discountTotalValue => double.tryParse(discountTotal) ?? 0;
  double get taxAmountValue => double.tryParse(taxAmount) ?? 0;
  double get grandTotalValue => double.tryParse(grandTotal) ?? 0;

  int get totalItems => items.fold(0, (sum, item) => sum + item.quantity);

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'] as String,
      orderNumber: json['orderNumber'] as String,
      profileId: json['profileId'] as String?,
      customerName: json['customerName'] as String,
      customerEmail: json['customerEmail'] as String?,
      customerPhone: json['customerPhone'] as String?,
      status: OrderStatus.fromString(json['status'] as String),
      orderType: OrderTypeExtension.fromString(json['orderType'] as String?),
      paymentMethod: json['paymentMethod'] as String?,
      notes: json['notes'] as String?,
      subtotal: json['subtotal'] as String,
      discountTotal: json['discountTotal'] as String,
      taxAmount: json['taxAmount'] as String,
      grandTotal: json['grandTotal'] as String,
      pointsEarned: json['pointsEarned'] as int? ?? 0,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      confirmedAt: json['confirmedAt'] != null
          ? DateTime.parse(json['confirmedAt'] as String)
          : null,
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      cancelledAt: json['cancelledAt'] != null
          ? DateTime.parse(json['cancelledAt'] as String)
          : null,
      items: (json['items'] as List<dynamic>?)
              ?.map((item) => OrderItem.fromJson(item as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderNumber': orderNumber,
      'profileId': profileId,
      'customerName': customerName,
      'customerEmail': customerEmail,
      'customerPhone': customerPhone,
      'status': status.value,
      'paymentMethod': paymentMethod,
      'notes': notes,
      'subtotal': subtotal,
      'discountTotal': discountTotal,
      'taxAmount': taxAmount,
      'grandTotal': grandTotal,
      'pointsEarned': pointsEarned,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'confirmedAt': confirmedAt?.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
      'cancelledAt': cancelledAt?.toIso8601String(),
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

enum OrderType {
  dineIn,
  pickup,
  takeaway,
}

extension OrderTypeExtension on OrderType {
  String get value {
    switch (this) {
      case OrderType.dineIn:
        return 'DINE_IN';
      case OrderType.pickup:
        return 'PICKUP';
      case OrderType.takeaway:
        return 'TAKEAWAY';
    }
  }

  String get displayName {
    switch (this) {
      case OrderType.dineIn:
        return 'Dine In';
      case OrderType.pickup:
        return 'Pickup';
      case OrderType.takeaway:
        return 'Window Takeaway';
    }
  }

  IconData get icon {
    switch (this) {
      case OrderType.dineIn:
        return Icons.restaurant_rounded;
      case OrderType.pickup:
        return Icons.shopping_bag_rounded;
      case OrderType.takeaway:
        return Icons.storefront_rounded;
    }
  }

  static OrderType fromString(String? value) {
    switch (value?.toUpperCase()) {
      case 'DINE_IN':
        return OrderType.dineIn;
      case 'PICKUP':
        return OrderType.pickup;
      case 'TAKEAWAY':
        return OrderType.takeaway;
      default:
        return OrderType.dineIn;
    }
  }
}

class CreateOrderRequest {
  final String customerName;
  final String? customerEmail;
  final String? customerPhone;
  final String? profileId;
  final String? notes;
  final OrderType orderType;
  final List<CreateOrderItemRequest> items;

  CreateOrderRequest({
    required this.customerName,
    this.customerEmail,
    this.customerPhone,
    this.profileId,
    this.notes,
    this.orderType = OrderType.dineIn,
    required this.items,
  });

  Map<String, dynamic> toJson() {
    return {
      'customerName': customerName,
      if (customerEmail != null) 'customerEmail': customerEmail,
      if (customerPhone != null) 'customerPhone': customerPhone,
      if (profileId != null) 'profileId': profileId,
      if (notes != null) 'notes': notes,
      'orderType': orderType.value,
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

class CreateOrderItemRequest {
  final String productId;
  final int quantity;

  CreateOrderItemRequest({
    required this.productId,
    required this.quantity,
  });

  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'quantity': quantity,
    };
  }
}

class OrdersResponse {
  final List<Order> orders;
  final OrderPagination? pagination;

  OrdersResponse({
    required this.orders,
    this.pagination,
  });

  factory OrdersResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'];

    // Handle both list response and single order response
    if (data is List) {
      return OrdersResponse(
        orders: data
            .map((order) => Order.fromJson(order as Map<String, dynamic>))
            .toList(),
        pagination: json['pagination'] != null
            ? OrderPagination.fromJson(json['pagination'] as Map<String, dynamic>)
            : null,
      );
    } else if (data is Map<String, dynamic>) {
      return OrdersResponse(
        orders: [Order.fromJson(data)],
        pagination: null,
      );
    }

    return OrdersResponse(orders: [], pagination: null);
  }
}

class OrderPagination {
  final int page;
  final int limit;
  final int total;
  final int totalPages;
  final bool hasNext;
  final bool hasPrev;

  OrderPagination({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
    required this.hasNext,
    required this.hasPrev,
  });

  factory OrderPagination.fromJson(Map<String, dynamic> json) {
    return OrderPagination(
      page: json['page'] as int,
      limit: json['limit'] as int,
      total: json['total'] as int,
      totalPages: json['totalPages'] as int,
      hasNext: json['hasNext'] as bool,
      hasPrev: json['hasPrev'] as bool,
    );
  }
}
