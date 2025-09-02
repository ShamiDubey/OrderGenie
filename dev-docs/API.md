# AI Dashboard API Documentation

Base URL: `http://localhost:3000`

---

## Authentication

**Admin routes require header:**
```
x-admin-token: 123
```

---

## Face Recognition APIs

### Register Face
```
POST /api/profiles/register
Content-Type: multipart/form-data

name: "John Doe"
email: "john@example.com"
image: [file]
```

### Recognize Face
```
POST /api/face/recognize
Content-Type: multipart/form-data

image: [file]
```
Returns matched profiles with similarity scores.

### Detect Faces
```
POST /api/face/detect
Content-Type: multipart/form-data

image: [file]
```
Returns face count and bounding boxes.

---

## Product APIs

### List Products (Public)
```
GET /api/products
GET /api/products?isVeg=true&category=uuid&tags=spicy&search=pizza&page=1&limit=20
```

### Get Featured Products (Public)
```
GET /api/products/featured
```

### Get Product (Public)
```
GET /api/products/:id
GET /api/products/slug/:slug
```

### Create Product (Admin)
```
POST /api/products
x-admin-token: 123
Content-Type: multipart/form-data

name: "Margherita Pizza" (required)
price: 299 (required)
description: "Classic Italian pizza"
isVeg: true
tags: "bestseller,italian"
categoryId: "uuid"
discountedPrice: 249
discountEnds: "2025-12-31"
preparationTime: 20
calories: 800
servingSize: "1 plate"
isFeatured: true
image: [file]
```

### Update Product (Admin)
```
PUT /api/products/:id
x-admin-token: 123
Content-Type: multipart/form-data

[any fields to update]
```

### Toggle Availability (Admin)
```
PATCH /api/products/:id/availability
x-admin-token: 123
Content-Type: application/json

{ "isAvailable": false }
```

### Delete Product (Admin)
```
DELETE /api/products/:id
x-admin-token: 123
```

---

## Category APIs

### List Categories (Public)
```
GET /api/categories
```

### Get Category (Public)
```
GET /api/categories/:id
GET /api/categories/:id/products
```

### Create Category (Admin)
```
POST /api/categories
x-admin-token: 123
Content-Type: multipart/form-data

name: "Beverages" (required)
description: "Drinks and refreshments"
displayOrder: 1
image: [file]
```

### Update Category (Admin)
```
PUT /api/categories/:id
x-admin-token: 123
```

### Delete Category (Admin)
```
DELETE /api/categories/:id
x-admin-token: 123
```

---

## Order APIs

### Create Order (Public)
```
POST /api/orders
Content-Type: application/json

{
  "customerName": "John Doe" (required),
  "customerEmail": "john@example.com",
  "customerPhone": "+91-9876543210",
  "profileId": "uuid (optional - link to face profile)",
  "notes": "Extra spicy please",
  "items": [
    { "productId": "uuid", "quantity": 2 },
    { "productId": "uuid", "quantity": 1 }
  ]
}
```
Returns order with calculated pricing (subtotal, discounts, grandTotal).

### Get Order (Public)
```
GET /api/orders/:id
GET /api/orders/number/:orderNumber
```

### Get Order History by Profile (Public)
```
GET /api/orders/profile/:profileId
GET /api/orders/profile/:profileId?page=1&limit=20
```

### Cancel Order (Public)
```
PATCH /api/orders/:id/cancel
```
Only works if order status is PENDING.

### List All Orders (Admin)
```
GET /api/orders
GET /api/orders?status=PENDING&page=1&limit=20
x-admin-token: 123
```
Filter by: status (PENDING, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED)

### Update Order Status (Admin)
```
PATCH /api/orders/:id/status
x-admin-token: 123
Content-Type: application/json

{ "status": "CONFIRMED" }
```

### Analytics: Top Products (Admin)
```
GET /api/orders/analytics/top-products
GET /api/orders/analytics/top-products?limit=10
x-admin-token: 123
```
Returns most ordered products with quantity and revenue.

### Analytics: Profile's Favorites (Admin)
```
GET /api/orders/analytics/profile/:profileId
x-admin-token: 123
```
Returns profile's most ordered products for recommendations.

---

## Recommendation APIs

### Get Trending Products (Public)
```
GET /api/recommendations/trending
GET /api/recommendations/trending?limit=10
```
Returns globally trending products based on order frequency.

### Get Personalized Recommendations (Public)
```
GET /api/recommendations/profile/:profileId
GET /api/recommendations/profile/:profileId?limit=10&context=homepage
```
Returns AI-powered personalized recommendations for a user.
- `context`: homepage, checkout, product:{id}
- Includes recommendation reasons and AI insights

### Get Similar Products (Public)
```
GET /api/recommendations/product/:productId/similar
GET /api/recommendations/product/:productId/similar?limit=5
```
Returns products similar to a given product.

### Get Recommendation Stats (Admin)
```
GET /api/recommendations/admin/stats
x-admin-token: 123
```
Returns system-wide recommendation statistics:
- Users with/without preferences
- Cache status (active/expired)
- Trending products status

### List Users with Preferences (Admin)
```
GET /api/recommendations/admin/users
GET /api/recommendations/admin/users?page=1&limit=20
x-admin-token: 123
```
Returns all users with their preference data and cache status.

### Get User Recommendation Details (Admin)
```
GET /api/recommendations/admin/user/:profileId
x-admin-token: 123
```
Returns detailed user data including:
- User preferences (veg preference, price range, affinities)
- Recent orders
- Generated recommendations
- Cache info with AI insights

### Refresh Recommendations (Admin)
```
POST /api/recommendations/refresh
x-admin-token: 123
Content-Type: application/json

{ "profileId": "uuid" }  // Optional - omit to refresh global trending
```
Force regenerates recommendations for a user or global trending.

### Cleanup Expired Cache (Admin)
```
POST /api/recommendations/cleanup
x-admin-token: 123
```
Removes expired cache entries from the database.

---

## Other Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profiles` | List all face profiles |
| GET | `/api/profiles/:id` | Get profile with embeddings |
| DELETE | `/api/profiles/:id` | Delete profile |
| GET | `/api/health` | Health check |

---

## Quick Test Flow

```bash
# 1. Create category
POST /api/categories (admin)
name=Pizzas

# 2. Create product
POST /api/products (admin)
name=Margherita, price=299, categoryId=<uuid>, image=<file>

# 3. List products
GET /api/products

# 4. Register face
POST /api/profiles/register
name=John, email=john@mail.com, image=<file>

# 5. Recognize face
POST /api/face/recognize
image=<file>

# 6. Create order
POST /api/orders
{ "customerName": "John", "items": [{ "productId": "<uuid>", "quantity": 2 }] }

# 7. Get order history
GET /api/orders/profile/<profileId>

# 8. Get recommendations
GET /api/orders/analytics/profile/<profileId> (admin)
```

---

## Response Format

All responses follow:
```json
{
  "success": true,
  "data": { ... },
  "pagination": { "page": 1, "total": 100 }
}
```

Error:
```json
{
  "success": false,
  "error": "Error message"
}
```
