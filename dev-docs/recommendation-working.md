# AI-Powered Recommendation System

This document explains the architecture, data flow, and implementation details of the AI-powered food recommendation system.

---

## Overview

The recommendation system provides personalized food suggestions based on customer order history using OpenAI GPT-3.5-turbo. It follows a microservices architecture:

- **Python Backend (FastAPI)**: All AI/ML logic - OpenAI calls, preference analysis, recommendation generation
- **Node Backend (Express)**: API orchestration, caching, database operations via Prisma
- **Frontend (Next.js)**: Consumes Node APIs, displays recommendations

---

## Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Next.js       │────▶│   Node.js       │────▶│   Python        │
│   Frontend      │     │   Express       │     │   FastAPI       │
│                 │◀────│                 │◀────│                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   PostgreSQL    │     │   OpenAI API    │
                        │   (Neon Cloud)  │     │   GPT-3.5-turbo │
                        └─────────────────┘     └─────────────────┘
```

---

## Database Schema

### UserPreference Table
Stores computed user preferences from order history analysis.

```prisma
model UserPreference {
  id                 String    @id @default(uuid())
  profileId          String    @unique
  vegPreference      Float     @default(0.5)  // 0=non-veg, 1=veg
  priceRange         String    @default("medium")  // low, medium, high
  avgOrderValue      Decimal   @default(0)
  categoryAffinities Json      @default("{}")  // {categoryId: score}
  tagAffinities      Json      @default("{}")  // {tag: score}
  favoriteProducts   String[]  @default([])
  totalOrders        Int       @default(0)
  lastOrderAt        DateTime?
}
```

### RecommendationCache Table
Caches generated recommendations to reduce API calls.

```prisma
model RecommendationCache {
  id              String    @id @default(uuid())
  profileId       String?   // null = global/trending
  type            String    // personalized, trending, similar
  context         String?   // homepage, product:{id}, checkout
  recommendations Json      // [{productId, score, reason, reasonType}]
  aiInsights      String?   // AI-generated insight about user
  expiresAt       DateTime
}
```

### GlobalAnalytics Table
Stores global analytics like trending products.

```prisma
model GlobalAnalytics {
  id         String   @id @default(uuid())
  type       String   @unique  // trending, popular_categories
  data       Json
  computedAt DateTime
  expiresAt  DateTime
}
```

---

## Data Flow

### 1. User Places an Order

```
User checkout → Node creates order → Order saved to DB
                                          ↓
                            setImmediate (non-blocking)
                                          ↓
                    Node calls Python: POST /api/recommendations/analyze/{profileId}
                                          ↓
                    Python analyzes order history with OpenAI
                                          ↓
                    Returns computed preferences
                                          ↓
                    Node saves to UserPreference table
                                          ↓
                    Node invalidates recommendation cache for user
```

**Code Location**: `node_backend/src/controllers/order.controller.ts:184-193`

```typescript
// Update recommendations in background (non-blocking)
if (profileId) {
  setImmediate(async () => {
    await recommendationService.updatePreferencesAfterOrder(profileId);
  });
}
```

### 2. Fetching Personalized Recommendations

```
Frontend requests recommendations
        ↓
GET /api/recommendations/profile/{profileId}
        ↓
Node checks RecommendationCache
        ↓
┌─────────────────────────────────────┐
│ Cache Hit & Not Expired?            │
│   YES → Return cached data          │
│   NO  → Call Python backend         │
└─────────────────────────────────────┘
        ↓ (cache miss)
POST /api/recommendations/generate/{profileId}
        ↓
Python fetches:
  - Order history from DB
  - User preferences (if exists)
  - All available products
        ↓
Python calls OpenAI GPT-3.5-turbo
        ↓
Returns recommendations with reasons
        ↓
Node caches result (24 hour TTL)
        ↓
Returns to frontend
```

### 3. Fetching Trending Products

```
Frontend requests trending
        ↓
GET /api/recommendations/trending
        ↓
Node checks GlobalAnalytics cache
        ↓
┌─────────────────────────────────────┐
│ Cache Hit & Not Expired?            │
│   YES → Return cached data          │
│   NO  → Call Python backend         │
└─────────────────────────────────────┘
        ↓ (cache miss)
GET /api/recommendations/trending
        ↓
Python queries most ordered products
(aggregates order_items by product)
        ↓
Node caches result (24 hour TTL)
        ↓
Returns to frontend
```

### 4. Fetching Similar Products

```
Product detail page loads
        ↓
GET /api/recommendations/product/{productId}/similar
        ↓
Node checks RecommendationCache (type=similar, context=product:{id})
        ↓
┌─────────────────────────────────────┐
│ Cache Hit & Not Expired?            │
│   YES → Return cached data          │
│   NO  → Call Python backend         │
└─────────────────────────────────────┘
        ↓ (cache miss)
POST /api/recommendations/similar/{productId}
        ↓
Python fetches product details + all products
        ↓
Python calls OpenAI to find similar products
(based on category, tags, price range, description)
        ↓
Node caches result (7 day TTL - products rarely change)
        ↓
Returns to frontend
```

---

## Python Services

### OpenAI Service
**File**: `python_backend/app/services/openai_service.py`

#### analyze_user_patterns()
Analyzes order history to extract preferences:
- Veg preference (0.0 to 1.0)
- Price range (low/medium/high)
- Category affinities
- Tag affinities
- Favorite products

**Prompt Strategy**: Sends order history as JSON to GPT-3.5-turbo with instructions to analyze patterns.

#### generate_recommendations()
Generates personalized recommendations:
- Takes user preferences + available products
- Returns top N products with scores and reasons
- Reason types: `preference`, `history`, `trending`, `similar`

**Prompt Strategy**: Provides user profile + product catalog, asks for ranked recommendations with human-readable reasons.

#### find_similar_products()
Finds products similar to a given product:
- Based on category, tags, price range
- Uses product descriptions for semantic similarity

### Database Service
**File**: `python_backend/app/services/database_service.py`

Uses `asyncpg` for direct PostgreSQL access (read-only operations):
- `get_order_history()` - Fetches orders with items for a profile
- `get_all_products()` - Fetches available products with categories
- `get_trending_products()` - Aggregates most ordered products

### Recommendation Service
**File**: `python_backend/app/services/recommendation_service.py`

Orchestrates the recommendation flow:
1. Fetches data from database
2. Computes rule-based preferences first
3. Enhances with AI analysis
4. Generates final recommendations

---

## Node Services

### Recommendation Service (Caching Layer)
**File**: `node_backend/src/services/recommendation.service.ts`

#### Cache TTL Configuration
```typescript
const CACHE_TTL_HOURS = 24;           // Personalized recommendations
const SIMILAR_CACHE_TTL_HOURS = 168;  // 7 days for similar products
```

#### Key Methods

| Method | Description |
|--------|-------------|
| `getPersonalized()` | Returns personalized recs, checks cache first |
| `getTrending()` | Returns global trending products |
| `getSimilar()` | Returns similar products for a product |
| `updatePreferencesAfterOrder()` | Updates preferences + invalidates cache |
| `refreshRecommendations()` | Force refresh (admin action) |
| `cleanExpiredCache()` | Removes expired cache entries |

#### Fallback Strategy
If AI/Python fails:
1. Return stale cache (if available)
2. Fall back to trending products
3. Return empty with error

### Python Client
**File**: `node_backend/src/services/python-client.ts`

HTTP client for Python backend communication:
```typescript
async analyzePreferences(profileId: string)
async generateRecommendations(profileId: string, limit: number)
async getTrendingProducts(limit: number)
async getSimilarProducts(productId: string, limit: number)
```

---

## API Endpoints

### Node Backend (Public-Facing)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recommendations/trending` | Get trending products |
| GET | `/api/recommendations/profile/:profileId` | Get personalized recommendations |
| GET | `/api/recommendations/product/:productId/similar` | Get similar products |
| POST | `/api/recommendations/refresh` | Force refresh (Admin) |
| POST | `/api/recommendations/cleanup` | Clean expired cache (Admin) |

### Python Backend (Internal)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/recommendations/analyze/{profile_id}` | Analyze user preferences |
| POST | `/api/recommendations/generate/{profile_id}` | Generate recommendations |
| GET | `/api/recommendations/trending` | Get trending products |
| POST | `/api/recommendations/similar/{product_id}` | Get similar products |

---

## Frontend Components

### RecommendedForYou
**File**: `web_frontend/src/components/recommendations/RecommendedForYou.tsx`

- Displays personalized recommendations for logged-in users
- Shows AI-generated reason badges for each product
- Reason types with colors:
  - `preference` - Purple: "Based on your preferences"
  - `history` - Blue: "From your order history"
  - `trending` - Orange: "Trending now"
  - `similar` - Green: "You might also like"

### TrendingProducts
**File**: `web_frontend/src/components/recommendations/TrendingProducts.tsx`

- Shows globally popular products
- Displays for guests or cold-start users
- Shows rank badges (1, 2, 3, etc.)

### SimilarProducts
**File**: `web_frontend/src/components/recommendations/SimilarProducts.tsx`

- Shows on product detail pages
- Horizontal scrollable grid
- "You Might Also Like" heading

### Recommendation Store
**File**: `web_frontend/src/stores/recommendationStore.ts`

Zustand store managing:
- Personalized recommendations
- Trending products
- Similar products (cached by product ID)
- Loading and error states
- Cache invalidation

---

## Integration Points

### Homepage (`web_frontend/src/app/page.tsx`)
```tsx
{isAuthenticated && user ? (
  <RecommendedForYou profileId={user.id} context="homepage" limit={10} />
) : (
  <TrendingProducts limit={10} />
)}
```

### Product Detail (`web_frontend/src/app/products/[id]/page.tsx`)
```tsx
<SimilarProducts productId={product.id} limit={5} />
```

### Order Creation Hook (`node_backend/src/controllers/order.controller.ts`)
```typescript
if (profileId) {
  setImmediate(async () => {
    await recommendationService.updatePreferencesAfterOrder(profileId);
  });
}
```

---

## Cache Invalidation

### When Cache is Invalidated

1. **After Order Creation**: User's personalized cache is cleared
2. **Admin Refresh**: Manual cache clear via API
3. **TTL Expiry**: Automatic expiry based on TTL
4. **Cleanup Job**: Periodic cleanup of expired entries

### Cache Keys

| Type | Key Structure | TTL |
|------|--------------|-----|
| Personalized | `{profileId, 'personalized', context}` | 24 hours |
| Trending | `{null, 'trending', null}` | 24 hours |
| Similar | `{null, 'similar', 'product:{productId}'}` | 7 days |

---

## Cost Optimization

1. **Aggressive Caching**: 24-hour cache for personalized, 7-day for similar
2. **Batch Analysis**: Preferences computed once per order, not per request
3. **Fallback to Rules**: Uses rule-based preferences when AI unavailable
4. **GPT-3.5-turbo**: Cost-effective model (~$0.002/1K tokens)

**Estimated Cost**: ~$0.01-0.05 per active user per day

---

## Error Handling

### Python Backend Failures
- Node returns stale cache if available
- Falls back to trending products
- Logs error for monitoring

### OpenAI API Failures
- Python catches exceptions
- Returns rule-based recommendations
- Includes `source: 'fallback'` in response

### Database Failures
- Graceful degradation to empty results
- Error logged with context

---

## Environment Variables

### Python Backend
```env
OPENAI_API_KEY=sk-proj-...
DATABASE_URL=postgresql://...
OPENAI_MODEL=gpt-3.5-turbo  # Optional, defaults to gpt-3.5-turbo
```

### Node Backend
```env
PYTHON_BACKEND_URL=http://localhost:8000
DATABASE_URL=postgresql://...
```

---

## Testing the System

### 1. Create Test Data
```bash
# Create products and categories via admin API
# Register a face profile
# Place several orders with the profile
```

### 2. Trigger Preference Analysis
```bash
# Preferences are auto-analyzed after each order
# Or manually trigger:
POST /api/recommendations/refresh
x-admin-token: 123
Body: { "profileId": "uuid" }
```

### 3. Fetch Recommendations
```bash
# Personalized
GET /api/recommendations/profile/{profileId}

# Trending
GET /api/recommendations/trending

# Similar
GET /api/recommendations/product/{productId}/similar
```

### 4. Check Cache
```bash
# Response includes source field:
# - "cache": Served from cache
# - "ai": Fresh from OpenAI
# - "stale_cache": Expired cache (fallback)
# - "computed": Computed without AI
```

---

## File Structure

```
├── python_backend/
│   └── app/
│       ├── services/
│       │   ├── database_service.py    # PostgreSQL queries
│       │   ├── openai_service.py      # OpenAI integration
│       │   └── recommendation_service.py  # Core logic
│       └── routers/
│           └── recommendations.py     # FastAPI endpoints
│
├── node_backend/
│   ├── prisma/
│   │   └── schema.prisma              # DB models
│   └── src/
│       ├── services/
│       │   ├── python-client.ts       # Python API client
│       │   └── recommendation.service.ts  # Caching layer
│       ├── controllers/
│       │   └── recommendation.controller.ts  # API handlers
│       └── routes/
│           └── recommendation.routes.ts  # Express routes
│
└── web_frontend/
    └── src/
        ├── stores/
        │   └── recommendationStore.ts  # Zustand store
        ├── components/
        │   └── recommendations/
        │       ├── RecommendedForYou.tsx
        │       ├── TrendingProducts.tsx
        │       └── SimilarProducts.tsx
        └── lib/
            └── api.ts                  # API functions
```
