"""
Chat service for AI-powered food ordering chatbot.
Orchestrates OpenAI conversations with product recommendations.
"""

import json
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime
from app.services.openai_service import openai_service
from app.services.database_service import db_service


class ChatService:
    def __init__(self):
        pass

    async def process_message(
        self,
        message: str,
        profile_id: Optional[str],
        conversation_history: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """
        Process a user message and generate AI response with product suggestions.
        """
        print("\n" + "="*60)
        print("🔵 CHAT REQUEST RECEIVED")
        print("="*60)
        print(f"👤 USER INPUT: {message}")
        print(f"📋 PROFILE ID: {profile_id or 'Guest'}")
        print(f"💬 CONVERSATION HISTORY ({len(conversation_history)} messages):")
        for i, msg in enumerate(conversation_history[-4:]):  # Show last 4
            role_icon = "👤" if msg.get('role') == 'user' else "🤖"
            print(f"   {role_icon} [{msg.get('role')}]: {msg.get('content', '')[:100]}...")
        print("-"*60)

        # Fetch all available products
        products = await db_service.get_all_products()
        print(f"📦 Loaded {len(products)} products from database")

        # Get user preferences if logged in
        user_preferences = None
        if profile_id:
            try:
                order_history = await db_service.get_order_history(profile_id)
                if order_history:
                    print(f"📊 Analyzing {len(order_history)} order history items...")
                    user_preferences = await openai_service.analyze_user_patterns(order_history)
                    print(f"✅ User preferences: {user_preferences}")
            except Exception as e:
                print(f"❌ Error fetching user preferences: {e}")

        # Build product context for AI
        products_context = self._build_product_context(products[:50])

        print("-"*60)
        print("🤖 CALLING OPENAI...")

        # Generate AI response
        response = await openai_service.chat_completion(
            message=message,
            conversation_history=conversation_history,
            products_context=products_context,
            user_preferences=user_preferences
        )

        print("-"*60)
        print("📤 OPENAI RESPONSE:")
        print(f"   Message: {response.get('message', 'N/A')[:200]}...")
        print(f"   Product IDs: {response.get('suggested_product_ids', [])}")
        print(f"   Intent: {response.get('intent', 'N/A')}")
        print(f"   Follow-ups: {response.get('follow_up_prompts', [])}")

        # Enrich response with full product data
        suggested_products = []
        if response.get('suggested_product_ids'):
            product_map = {p['id']: p for p in products}
            for pid in response['suggested_product_ids'][:5]:  # Limit to 5 suggestions
                if pid in product_map:
                    product = product_map[pid]
                    suggested_products.append(self._format_product(product))
                else:
                    print(f"   ⚠️ Product ID not found: {pid}")

        final_response = {
            'message': response.get('message', "I'm here to help you find something delicious!"),
            'suggested_products': suggested_products,
            'intent': response.get('intent', 'recommendation'),
            'follow_up_prompts': response.get('follow_up_prompts', [
                "Something spicy",
                "Vegetarian options",
                "Quick bites"
            ])
        }

        print("-"*60)
        print("✅ FINAL RESPONSE TO FRONTEND:")
        print(f"   Message: {final_response['message'][:200]}...")
        print(f"   Products: {[p['name'] for p in suggested_products]}")
        print(f"   Intent: {final_response['intent']}")
        print("="*60 + "\n")

        return final_response

    async def get_products_for_cart(
        self,
        product_ids: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Get full product data for cart integration.
        """
        products = await db_service.get_all_products()
        product_map = {p['id']: p for p in products}

        result = []
        for pid in product_ids:
            if pid in product_map:
                result.append(self._format_product(product_map[pid]))

        return result

    def _build_product_context(self, products: List[Dict[str, Any]]) -> str:
        """Build a detailed product context for the AI prompt."""
        lines = ["=== OUR COMPLETE MENU ==="]

        # Group by category for better context
        categories = {}
        for p in products:
            cat = p.get('category_name', 'Other')
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(p)

        for category, items in categories.items():
            lines.append(f"\n📂 {category.upper()}:")
            for p in items[:10]:  # Limit items per category
                price = self._safe_float(p.get('price', 0))
                discounted = self._safe_float(p.get('discounted_price'))
                veg = "🟢 Veg" if p.get('is_veg', True) else "🔴 Non-Veg"
                tags = ", ".join(p.get('tags', [])) if p.get('tags') else "none"

                # Price info
                if discounted and discounted < price:
                    discount_pct = round((price - discounted) / price * 100)
                    price_str = f"₹{discounted:.0f} (₹{price:.0f}, {discount_pct}% OFF!)"
                else:
                    price_str = f"₹{price:.0f}"

                # Additional details
                prep_time = p.get('preparation_time')
                calories = p.get('calories')
                desc = p.get('description', '')

                lines.append(f"  • {p['name']} [ID: {p['id']}]")
                lines.append(f"    {veg} | {price_str}")
                if prep_time:
                    lines.append(f"    ⏱️ Prep: {prep_time} mins")
                if calories:
                    lines.append(f"    🔥 Calories: {calories}")
                if tags != "none":
                    lines.append(f"    🏷️ Tags: {tags}")
                if desc:
                    lines.append(f"    📝 {desc[:100]}{'...' if len(desc) > 100 else ''}")

        # Add category summary
        lines.append("\n=== CATEGORY SUMMARY ===")
        for cat, items in categories.items():
            veg_count = sum(1 for p in items if p.get('is_veg', True))
            lines.append(f"• {cat}: {len(items)} items ({veg_count} veg)")

        return "\n".join(lines)

    def _format_product(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """Format product for API response."""
        price = self._safe_float(product.get('price', 0))
        discounted_price = self._safe_float(product.get('discounted_price'))

        # Calculate effective price and discount
        has_active_discount = False
        effective_price = price
        discount_percent = 0

        if discounted_price and discounted_price > 0 and discounted_price < price:
            discount_ends = product.get('discount_ends')
            if discount_ends:
                try:
                    if isinstance(discount_ends, str):
                        end_date = datetime.fromisoformat(discount_ends.replace('Z', '+00:00'))
                    else:
                        end_date = discount_ends
                    has_active_discount = end_date > datetime.now(end_date.tzinfo)
                except:
                    has_active_discount = True
            else:
                has_active_discount = True

            if has_active_discount:
                effective_price = discounted_price
                discount_percent = round((price - discounted_price) / price * 100)

        return {
            'id': product['id'],
            'name': product['name'],
            'slug': product['slug'],
            'description': product.get('description'),
            'price': price,
            'discounted_price': discounted_price,
            'effective_price': effective_price,
            'is_veg': product.get('is_veg', True),
            'image_url': product.get('image_url'),
            'thumbnail_url': product.get('thumbnail_url'),
            'category_id': product.get('category_id'),
            'category_name': product.get('category_name'),
            'category_slug': product.get('category_slug'),
            'has_active_discount': has_active_discount,
            'discount_percent': discount_percent,
            'royalty_points': product.get('royalty_points', 50),
            'preparation_time': product.get('preparation_time'),
            'calories': product.get('calories'),
            'is_available': product.get('is_available', True),
            'is_featured': product.get('is_featured', False),
            'tags': product.get('tags', []),
        }

    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert value to float."""
        if value is None:
            return None
        if isinstance(value, Decimal):
            return float(value)
        try:
            return float(value)
        except (ValueError, TypeError):
            return None


# Singleton instance
chat_service = ChatService()
