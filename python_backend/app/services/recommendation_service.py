"""
Recommendation service that orchestrates AI-powered food recommendations.
Combines database queries with OpenAI analysis for personalized suggestions.
"""

from typing import List, Dict, Any, Optional
from collections import defaultdict
from decimal import Decimal

from app.services.database_service import db_service
from app.services.openai_service import openai_service


class RecommendationService:
    """Service for generating food recommendations using AI."""

    async def compute_preferences(self, profile_id: str) -> Dict[str, Any]:
        """
        Compute user preferences from their order history.
        Combines rule-based analysis with AI pattern recognition.
        Returns preferences plus personalized insight and metadata.
        """
        # Get order history from database
        order_history = await db_service.get_order_history(profile_id)

        if not order_history:
            return self._get_new_user_preferences()

        # Get customer name and points for personalized insights
        profile = await db_service.get_profile_by_id(profile_id)
        customer_name = profile.get("name", "Customer") if profile else "Customer"
        total_points = profile.get("total_points", 0) if profile else 0

        # Compute basic stats first (rule-based)
        rule_based = self._compute_rule_based_preferences(order_history)

        # Enhance with AI analysis
        try:
            ai_preferences = await openai_service.analyze_user_patterns(
                order_history,
                customer_name=customer_name,
                total_points=total_points
            )

            # Merge rule-based with AI preferences
            return {
                "vegPreference": ai_preferences.get("vegPreference", rule_based["vegPreference"]),
                "priceRange": ai_preferences.get("priceRange", rule_based["priceRange"]),
                "avgOrderValue": rule_based["avgOrderValue"],
                "categoryAffinities": rule_based["categoryAffinities"],
                "tagAffinities": rule_based["tagAffinities"],
                "favoriteProducts": rule_based["favoriteProducts"],
                "preferredCategories": ai_preferences.get("preferredCategories", []),
                "preferredTags": ai_preferences.get("preferredTags", []),
                "totalOrders": rule_based["totalOrders"],
                "insight": ai_preferences.get("insight", "Regular customer"),
                "insightMetadata": ai_preferences.get("insightMetadata", {}),
                "source": "ai_enhanced"
            }
        except Exception as e:
            print(f"AI analysis failed, using rule-based: {e}")
            return {**rule_based, "insightMetadata": {}, "source": "rule_based"}

    async def get_personalized_recommendations(
        self,
        profile_id: str,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get personalized product recommendations for a user.
        Returns products with AI-generated reasons.
        """
        # Compute or retrieve preferences
        preferences = await self.compute_preferences(profile_id)

        # Get all available products
        products = await db_service.get_all_products()

        if not products:
            return {
                "success": True,
                "recommendations": [],
                "insights": "No products available",
                "source": "empty"
            }

        # Convert Decimal to float for JSON serialization
        products = self._convert_decimals(products)

        # Generate AI recommendations
        try:
            recommendations = await openai_service.generate_recommendations(
                preferences, products, limit
            )

            # If AI returned empty recommendations, use fallback
            if not recommendations:
                print("AI returned empty recommendations, using fallback")
                return await self._get_fallback_recommendations(preferences, products, limit)

            # Enrich recommendations with product data
            product_map = {p['id']: p for p in products}
            enriched = []

            for rec in recommendations:
                product = product_map.get(rec['productId'])
                if product:
                    enriched.append({
                        "product": product,
                        "score": rec['score'],
                        "reason": rec['reason'],
                        "reasonType": rec['reasonType']
                    })

            # If enrichment resulted in empty list (product IDs not found), use fallback
            if not enriched:
                print("No valid products found in AI recommendations, using fallback")
                return await self._get_fallback_recommendations(preferences, products, limit)

            return {
                "success": True,
                "recommendations": enriched,
                "insights": preferences.get("insight", ""),
                "preferences": {
                    "vegPreference": preferences.get("vegPreference"),
                    "priceRange": preferences.get("priceRange"),
                    "preferredCategories": preferences.get("preferredCategories", [])
                },
                "source": "personalized"
            }

        except Exception as e:
            print(f"AI recommendation failed: {e}")
            # Fallback to rule-based recommendations
            return await self._get_fallback_recommendations(preferences, products, limit)

    async def get_trending_products(self, limit: int = 10) -> Dict[str, Any]:
        """
        Get globally trending products based on order frequency.
        Used for guests and cold-start scenarios.
        """
        try:
            trending = await db_service.get_trending_products(limit)
            trending = self._convert_decimals(trending)

            return {
                "success": True,
                "products": trending,
                "source": "trending"
            }
        except Exception as e:
            print(f"Error getting trending products: {e}")
            return {
                "success": False,
                "error": str(e),
                "products": []
            }

    async def get_similar_products(
        self,
        product_id: str,
        limit: int = 5
    ) -> Dict[str, Any]:
        """
        Get products similar to a given product.
        Used for "You might also like" sections.
        """
        try:
            # Get the source product
            product = await db_service.get_product_by_id(product_id)
            if not product:
                return {
                    "success": False,
                    "error": "Product not found",
                    "products": []
                }

            product = self._convert_decimals([product])[0]

            # Get all products
            all_products = await db_service.get_all_products()
            all_products = self._convert_decimals(all_products)

            # Use AI to find similar products
            similar_ids = await openai_service.find_similar_products(
                product, all_products, limit
            )

            # Enrich with product data
            product_map = {p['id']: p for p in all_products}
            similar_products = [
                product_map[pid] for pid in similar_ids if pid in product_map
            ]

            # If AI fails, use rule-based similarity
            if not similar_products:
                similar_products = self._find_similar_rule_based(
                    product, all_products, limit
                )

            return {
                "success": True,
                "products": similar_products,
                "source": "similar"
            }

        except Exception as e:
            print(f"Error getting similar products: {e}")
            return {
                "success": False,
                "error": str(e),
                "products": []
            }

    def _compute_rule_based_preferences(
        self,
        order_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Compute preferences using rule-based analysis."""
        if not order_history:
            return self._get_new_user_preferences()

        # Count veg/non-veg items
        veg_count = sum(1 for item in order_history if item.get('is_veg', True))
        total_items = len(order_history)
        veg_preference = veg_count / total_items if total_items > 0 else 0.5

        # Calculate average order value
        unique_orders = set(item.get('order_id') for item in order_history)
        total_spent = sum(float(item.get('line_total', 0)) for item in order_history)
        avg_order_value = total_spent / len(unique_orders) if unique_orders else 0

        # Determine price range
        avg_item_price = total_spent / total_items if total_items > 0 else 0
        if avg_item_price < 100:
            price_range = "low"
        elif avg_item_price < 300:
            price_range = "medium"
        else:
            price_range = "high"

        # Category affinities
        category_counts = defaultdict(int)
        for item in order_history:
            cat = item.get('category_name', 'Unknown')
            category_counts[cat] += item.get('quantity', 1)

        total_qty = sum(category_counts.values())
        category_affinities = {
            cat: count / total_qty
            for cat, count in category_counts.items()
        } if total_qty > 0 else {}

        # Product frequency for favorites
        product_counts = defaultdict(int)
        for item in order_history:
            product_counts[item.get('product_id')] += item.get('quantity', 1)

        favorite_products = [
            pid for pid, _ in sorted(
                product_counts.items(), key=lambda x: -x[1]
            )[:5] if pid
        ]

        # Tag affinities (would need tags from products - simplified here)
        tag_affinities = {}

        return {
            "vegPreference": round(veg_preference, 2),
            "priceRange": price_range,
            "avgOrderValue": round(avg_order_value, 2),
            "categoryAffinities": category_affinities,
            "tagAffinities": tag_affinities,
            "favoriteProducts": favorite_products,
            "totalOrders": len(unique_orders),
            "insight": f"Ordered {total_items} items across {len(unique_orders)} orders"
        }

    def _get_new_user_preferences(self) -> Dict[str, Any]:
        """Default preferences for new users."""
        return {
            "vegPreference": 0.5,
            "priceRange": "medium",
            "avgOrderValue": 0,
            "categoryAffinities": {},
            "tagAffinities": {},
            "favoriteProducts": [],
            "preferredCategories": [],
            "preferredTags": [],
            "totalOrders": 0,
            "insight": "New customer - showing popular items",
            "source": "new_user"
        }

    async def _get_fallback_recommendations(
        self,
        preferences: Dict[str, Any],
        products: List[Dict[str, Any]],
        limit: int
    ) -> Dict[str, Any]:
        """Generate rule-based recommendations when AI fails."""
        scored_products = []

        user_veg_pref = preferences.get("vegPreference", 0.5)
        preferred_categories = preferences.get("preferredCategories", [])
        favorite_products = preferences.get("favoriteProducts", [])

        for product in products:
            score = 0.5  # Base score
            reason = "Popular choice"
            reason_type = "trending"

            # Veg preference matching
            is_veg = product.get("is_veg", True)
            if user_veg_pref > 0.6 and is_veg:
                score += 0.2
                reason = "Matches your vegetarian preference"
                reason_type = "preference"
            elif user_veg_pref < 0.4 and not is_veg:
                score += 0.2
                reason = "For the non-veg lover in you"
                reason_type = "preference"

            # Category matching
            category = product.get("category_name", "")
            if category in preferred_categories:
                score += 0.2
                reason = f"From your favorite: {category}"
                reason_type = "preference"

            # Favorite product bonus
            if product.get("id") in favorite_products:
                score += 0.3
                reason = "One of your favorites"
                reason_type = "history"

            # Featured bonus
            if product.get("is_featured"):
                score += 0.1
                if reason_type == "trending":
                    reason = "Featured bestseller"

            scored_products.append({
                "product": product,
                "score": min(score, 1.0),
                "reason": reason,
                "reasonType": reason_type
            })

        # Sort by score and limit
        scored_products.sort(key=lambda x: -x["score"])

        return {
            "success": True,
            "recommendations": scored_products[:limit],
            "insights": preferences.get("insight", "Showing popular items based on your preferences"),
            "preferences": {
                "vegPreference": preferences.get("vegPreference"),
                "priceRange": preferences.get("priceRange"),
                "preferredCategories": preferred_categories
            },
            "source": "fallback"
        }

    def _find_similar_rule_based(
        self,
        product: Dict[str, Any],
        all_products: List[Dict[str, Any]],
        limit: int
    ) -> List[Dict[str, Any]]:
        """Find similar products using rule-based matching."""
        source_category = product.get("category_id")
        source_is_veg = product.get("is_veg", True)
        source_price = float(product.get("price", 0))

        scored = []
        for p in all_products:
            if p["id"] == product["id"]:
                continue

            score = 0

            # Same category
            if p.get("category_id") == source_category:
                score += 0.4

            # Same veg/non-veg
            if p.get("is_veg") == source_is_veg:
                score += 0.3

            # Similar price (within 30%)
            p_price = float(p.get("price", 0))
            if source_price > 0 and abs(p_price - source_price) / source_price < 0.3:
                score += 0.2

            # Tag overlap would add more score here
            scored.append((score, p))

        scored.sort(key=lambda x: -x[0])
        return [p for _, p in scored[:limit]]

    def _convert_decimals(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert Decimal fields to float for JSON serialization."""
        result = []
        for item in items:
            converted = {}
            for key, value in item.items():
                if isinstance(value, Decimal):
                    converted[key] = float(value)
                else:
                    converted[key] = value
            result.append(converted)
        return result


# Singleton instance
recommendation_service = RecommendationService()
