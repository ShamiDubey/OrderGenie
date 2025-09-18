"""
OpenAI service for AI-powered food recommendations.
Uses GPT-3.5-turbo to analyze patterns and generate personalized recommendations.
"""

import json
from typing import List, Dict, Any
from openai import OpenAI
from app.config import settings


class OpenAIService:
    def __init__(self):
        self.client = None
        self.model = settings.OPENAI_MODEL

    def initialize(self):
        """Initialize the OpenAI client."""
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not configured")

        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    async def analyze_user_patterns(
        self,
        order_history: List[Dict[str, Any]],
        customer_name: str = "Customer",
        total_points: int = 0
    ) -> Dict[str, Any]:
        """
        Analyze user's order history to extract preferences and generate unique insights.
        Returns computed preference scores plus personalized AI insight and metadata
        including greetings, conversation topics, and upsell suggestions.
        """
        if not self.client:
            self.initialize()

        if not order_history:
            return self._get_default_preferences()

        # Prepare order summary for the prompt
        order_summary = self._prepare_order_summary(order_history)

        # Calculate additional stats for the insight
        stats = self._calculate_customer_stats(order_history, total_points)

        # Determine customer tier for greeting context
        total_points = stats.get('total_points', 0)
        customer_tier = "new"
        if total_points >= 1000:
            customer_tier = "VIP"
        elif total_points >= 500:
            customer_tier = "loyal"
        elif total_points >= 100:
            customer_tier = "regular"
        elif stats['total_orders'] > 0:
            customer_tier = "returning"

        first_name = customer_name.split()[0] if customer_name else "there"

        prompt = f"""Analyze this customer's food order history and generate EVERYTHING an employee needs to serve them well.

CUSTOMER: {customer_name} (use "{first_name}" in greetings)
LOYALTY STATUS: {customer_tier} customer with {total_points} points

ORDER HISTORY SUMMARY:
{order_summary}

STATS:
- Total Orders: {stats['total_orders']}
- Total Items: {stats['total_items']}
- Avg Order Value: ₹{stats['avg_order_value']:.0f}
- Top Items: {', '.join(stats['top_items'][:3])}
- Top Categories: {', '.join(stats['top_categories'][:2])}
- Veg/Non-Veg: {stats['veg_count']}/{stats['non_veg_count']}
- Days as Customer: {stats['days_as_customer']}
- Visit Frequency: Every {stats['avg_order_frequency']:.0f} days

Generate:
1. PREFERENCES (vegPreference 0-1, priceRange)
2. UNIQUE INSIGHT (2-3 sentences mentioning their favorite dishes BY NAME)
3. PERSONALIZED GREETINGS (3 options using their first name, referencing their history)
4. CONVERSATION TOPICS (2-3 specific things to discuss based on their orders)
5. SPECIAL NOTES (things to remember about this customer)
6. UPSELL SUGGESTIONS (2-3 products they'd likely enjoy with reasons)

GREETING EXAMPLES (be this personal):
- "{first_name}! Back for your usual Chole Bhature?"
- "Hey {first_name}, great to see you! How was the Masala Dosa last time?"
- "{first_name}, welcome back! Your {total_points} points are adding up nicely!"

Return ONLY valid JSON:
{{
    "vegPreference": 0.0-1.0,
    "priceRange": "low" | "medium" | "high",
    "preferredCategories": ["category1", "category2"],
    "preferredTags": ["tag1", "tag2"],
    "insight": "Personalized insight mentioning their actual favorite dishes",
    "insightMetadata": {{
        "favoriteItems": ["Dish 1", "Dish 2"],
        "favoriteCategories": ["Category 1"],
        "orderingPattern": "weekly" | "biweekly" | "occasional" | "frequent",
        "avgVisitFrequency": {stats['avg_order_frequency']:.0f},
        "dietaryStyle": "vegetarian" | "non_vegetarian" | "mixed",
        "spendingTier": "budget" | "medium" | "premium",
        "loyaltyStatus": "{customer_tier}",
        "lastAnalyzedOrderCount": {stats['total_orders']},
        "greetings": [
            "Personal greeting 1 using {first_name}",
            "Personal greeting 2 referencing their favorites",
            "Personal greeting 3"
        ],
        "conversationTopics": [
            "Specific topic based on their order history",
            "Another personalized talking point"
        ],
        "specialNotes": [
            "Important thing to remember about this customer"
        ],
        "upsellSuggestions": [
            {{"productName": "Product Name", "reason": "Why they'd like it based on history"}}
        ]
    }}
}}"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a food preference analyzer that creates UNIQUE, personalized customer insights. Never use generic templates. Always reference specific dishes and patterns from the order history."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,  # Slightly higher for more varied insights
                max_tokens=800
            )

            result_text = response.choices[0].message.content.strip()

            # Extract JSON from the response
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()

            result = json.loads(result_text)

            # Ensure insightMetadata exists with all required fields
            if "insightMetadata" not in result:
                result["insightMetadata"] = self._build_default_metadata(stats, customer_name)
            else:
                # Ensure communication fields exist even if AI didn't provide them
                metadata = result["insightMetadata"]
                if "greetings" not in metadata or not metadata["greetings"]:
                    default_meta = self._build_default_metadata(stats, customer_name)
                    metadata["greetings"] = default_meta["greetings"]
                if "conversationTopics" not in metadata or not metadata["conversationTopics"]:
                    default_meta = self._build_default_metadata(stats, customer_name)
                    metadata["conversationTopics"] = default_meta["conversationTopics"]
                if "specialNotes" not in metadata:
                    metadata["specialNotes"] = []
                if "upsellSuggestions" not in metadata:
                    metadata["upsellSuggestions"] = []

            return result

        except Exception as e:
            print(f"Error analyzing patterns: {e}")
            return self._get_default_preferences()

    def _calculate_customer_stats(
        self,
        order_history: List[Dict[str, Any]],
        total_points: int = 0
    ) -> Dict[str, Any]:
        """Calculate detailed stats from order history for insight generation."""
        if not order_history:
            return {
                'total_orders': 0,
                'total_items': 0,
                'avg_order_value': 0,
                'top_items': [],
                'top_categories': [],
                'veg_count': 0,
                'non_veg_count': 0,
                'days_as_customer': 0,
                'avg_order_frequency': 0,
                'total_points': total_points
            }

        # Group by order for unique order count
        unique_orders = set(item.get('order_id') for item in order_history)
        total_items = sum(item.get('quantity', 1) for item in order_history)
        total_spent = sum(float(item.get('line_total', 0)) for item in order_history)
        avg_order_value = total_spent / len(unique_orders) if unique_orders else 0

        # Count products
        product_counts = {}
        category_counts = {}
        veg_count = 0
        non_veg_count = 0

        for item in order_history:
            name = item.get('product_name', 'Unknown')
            qty = item.get('quantity', 1)
            is_veg = item.get('is_veg', True)
            category = item.get('category_name', 'Unknown')

            product_counts[name] = product_counts.get(name, 0) + qty
            category_counts[category] = category_counts.get(category, 0) + qty

            if is_veg:
                veg_count += qty
            else:
                non_veg_count += qty

        # Sort for top items/categories
        top_items = sorted(product_counts.items(), key=lambda x: -x[1])
        top_categories = sorted(category_counts.items(), key=lambda x: -x[1])

        # Calculate customer tenure and order frequency
        from datetime import datetime
        try:
            order_dates = []
            for item in order_history:
                if 'created_at' in item:
                    date_str = item['created_at']
                    if isinstance(date_str, str):
                        # Handle ISO format
                        date_str = date_str.replace('Z', '+00:00')
                        order_dates.append(datetime.fromisoformat(date_str))

            if order_dates:
                unique_dates = list(set(d.date() for d in order_dates))
                unique_dates.sort()
                days_as_customer = (datetime.now().date() - unique_dates[0]).days if unique_dates else 0

                if len(unique_dates) > 1:
                    total_days_between = (unique_dates[-1] - unique_dates[0]).days
                    avg_order_frequency = total_days_between / (len(unique_dates) - 1)
                else:
                    avg_order_frequency = 0
            else:
                days_as_customer = 0
                avg_order_frequency = 0
        except Exception as e:
            print(f"Error calculating dates: {e}")
            days_as_customer = 0
            avg_order_frequency = 0

        return {
            'total_orders': len(unique_orders),
            'total_items': total_items,
            'avg_order_value': avg_order_value,
            'top_items': [name for name, _ in top_items],
            'top_categories': [name for name, _ in top_categories],
            'veg_count': veg_count,
            'non_veg_count': non_veg_count,
            'days_as_customer': days_as_customer,
            'avg_order_frequency': avg_order_frequency,
            'total_points': total_points
        }

    def _build_default_metadata(self, stats: Dict[str, Any], customer_name: str = "Customer") -> Dict[str, Any]:
        """Build default metadata from stats when AI doesn't provide it."""
        total_items = stats.get('veg_count', 0) + stats.get('non_veg_count', 0)
        veg_ratio = stats.get('veg_count', 0) / total_items if total_items > 0 else 0.5

        # Determine dietary style
        if veg_ratio > 0.8:
            dietary_style = "vegetarian"
        elif veg_ratio < 0.3:
            dietary_style = "non_vegetarian"
        else:
            dietary_style = "mixed"

        # Determine spending tier
        avg_value = stats.get('avg_order_value', 0)
        if avg_value < 150:
            spending_tier = "budget"
        elif avg_value < 400:
            spending_tier = "medium"
        else:
            spending_tier = "premium"

        # Determine loyalty status
        total_orders = stats.get('total_orders', 0)
        if total_orders < 3:
            loyalty_status = "new"
        elif total_orders < 10:
            loyalty_status = "regular"
        elif total_orders < 25:
            loyalty_status = "loyal"
        else:
            loyalty_status = "vip"

        # Determine ordering pattern
        avg_freq = stats.get('avg_order_frequency', 0)
        if avg_freq < 4:
            ordering_pattern = "frequent"
        elif avg_freq < 10:
            ordering_pattern = "weekly"
        elif avg_freq < 20:
            ordering_pattern = "biweekly"
        else:
            ordering_pattern = "occasional"

        # Generate default greetings based on customer info
        first_name = customer_name.split()[0] if customer_name else "there"
        total_points = stats.get('total_points', 0)
        top_items = stats.get('top_items', [])

        # Build personalized greetings
        if loyalty_status == "new":
            greetings = [
                f"Welcome {first_name}! First time here?",
                f"Hi {first_name}, great to have you!",
                f"Hello {first_name}! What can I get for you today?"
            ]
        elif top_items:
            greetings = [
                f"{first_name}! Back for your usual {top_items[0]}?" if top_items else f"Welcome back, {first_name}!",
                f"Hey {first_name}, great to see you again!",
                f"{first_name}! Good to have you back - {total_points} points and counting!"
            ]
        else:
            greetings = [
                f"Welcome back, {first_name}!",
                f"Hi {first_name}, great to see you!",
                f"Hello {first_name}! What are you in the mood for today?"
            ]

        # Build conversation topics
        conversation_topics = []
        if top_items:
            conversation_topics.append(f"Ask about their experience with {top_items[0]}")
        if total_points > 100:
            conversation_topics.append(f"They have {total_points} loyalty points - mention rewards!")
        if not conversation_topics:
            conversation_topics.append("Ask about their food preferences")

        # Build special notes
        special_notes = []
        if dietary_style == "vegetarian":
            special_notes.append("Vegetarian customer - highlight veg options")
        elif dietary_style == "non_vegetarian":
            special_notes.append("Non-veg lover - suggest meat dishes")
        if loyalty_status in ["loyal", "vip"]:
            special_notes.append(f"{loyalty_status.upper()} customer - extra care!")
        if not special_notes:
            special_notes.append(f"{loyalty_status.title()} customer")

        return {
            "favoriteItems": stats.get('top_items', [])[:3],
            "favoriteCategories": stats.get('top_categories', [])[:2],
            "orderingPattern": ordering_pattern,
            "avgVisitFrequency": round(avg_freq),
            "dietaryStyle": dietary_style,
            "spendingTier": spending_tier,
            "loyaltyStatus": loyalty_status,
            "lastAnalyzedOrderCount": total_orders,
            "greetings": greetings,
            "conversationTopics": conversation_topics,
            "specialNotes": special_notes,
            "upsellSuggestions": []
        }

    async def generate_recommendations(
        self,
        preferences: Dict[str, Any],
        products: List[Dict[str, Any]],
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Generate personalized product recommendations with reasons.
        Returns list of product IDs with scores and personalized reasons.
        """
        if not self.client:
            self.initialize()

        if not products:
            return []

        # Prepare products summary
        products_summary = self._prepare_products_summary(products[:50])  # Limit to avoid token issues

        prompt = f"""You are a food recommendation AI for a restaurant ordering app.

Customer Preferences:
- Veg Preference: {preferences.get('vegPreference', 0.5)} (0=non-veg lover, 1=vegetarian)
- Price Range: {preferences.get('priceRange', 'medium')}
- Favorite Categories: {preferences.get('preferredCategories', [])}
- Favorite Tags: {preferences.get('preferredTags', [])}
- Recent Favorites: {preferences.get('favoriteProducts', [])}

Available Products:
{products_summary}

Select the top {limit} products that would best match this customer's preferences.
For each product, provide a brief, friendly reason (max 10 words) explaining why they'd like it.

Reason examples:
- "Because you love spicy food"
- "A bestseller in your favorite category"
- "Perfect for your vegetarian preference"
- "Similar to dishes you've enjoyed"

Return ONLY a JSON array in this format:
[
    {{"productId": "id", "score": 0.0-1.0, "reason": "friendly reason", "reasonType": "preference|history|trending|similar"}}
]

Sort by score descending. Higher score = better match."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a personalized food recommendation AI. Return recommendations as a JSON array."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=1500
            )

            result_text = response.choices[0].message.content.strip()

            # Extract JSON from the response
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()

            recommendations = json.loads(result_text)

            # Validate and limit results
            valid_recommendations = []
            product_ids = {p['id'] for p in products}

            for rec in recommendations[:limit]:
                if rec.get('productId') in product_ids:
                    valid_recommendations.append({
                        'productId': rec['productId'],
                        'score': min(max(float(rec.get('score', 0.5)), 0), 1),
                        'reason': rec.get('reason', 'Recommended for you'),
                        'reasonType': rec.get('reasonType', 'preference')
                    })

            return valid_recommendations

        except Exception as e:
            print(f"Error generating recommendations: {e}")
            return []

    async def find_similar_products(
        self,
        product: Dict[str, Any],
        all_products: List[Dict[str, Any]],
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find products similar to a given product.
        Used for "You might also like" sections.
        """
        if not self.client:
            self.initialize()

        # Filter out the source product
        other_products = [p for p in all_products if p['id'] != product['id']]

        if not other_products:
            return []

        products_summary = self._prepare_products_summary(other_products[:30])

        prompt = f"""Find products similar to this food item:

Source Product:
- Name: {product.get('name')}
- Category: {product.get('category_name', 'Unknown')}
- Tags: {product.get('tags', [])}
- Is Vegetarian: {product.get('is_veg', True)}
- Price: {product.get('price')}
- Description: {product.get('description', 'No description')}

Available Products:
{products_summary}

Select {limit} products that are most similar to the source product based on:
1. Same or similar category
2. Similar tags/attributes
3. Similar price range
4. Same veg/non-veg type

Return ONLY a JSON array of product IDs:
["id1", "id2", "id3", ...]"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You find similar food products. Return only a JSON array of product IDs."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=300
            )

            result_text = response.choices[0].message.content.strip()

            # Extract JSON from the response
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()

            similar_ids = json.loads(result_text)

            # Validate IDs
            valid_ids = {p['id'] for p in other_products}
            return [pid for pid in similar_ids if pid in valid_ids][:limit]

        except Exception as e:
            print(f"Error finding similar products: {e}")
            return []

    def _prepare_order_summary(self, order_history: List[Dict[str, Any]]) -> str:
        """Prepare order history as a readable summary."""
        # Group by product
        product_counts = {}
        total_spent = 0
        veg_count = 0
        non_veg_count = 0
        categories = {}

        for item in order_history:
            name = item.get('product_name', 'Unknown')
            qty = item.get('quantity', 1)
            is_veg = item.get('is_veg', True)
            category = item.get('category_name', 'Unknown')
            price = float(item.get('effective_price', 0))

            product_counts[name] = product_counts.get(name, 0) + qty
            total_spent += price * qty

            if is_veg:
                veg_count += qty
            else:
                non_veg_count += qty

            categories[category] = categories.get(category, 0) + qty

        # Build summary
        lines = []
        lines.append(f"Total orders analyzed: {len(set(item.get('order_id') for item in order_history))}")
        lines.append(f"Total items ordered: {sum(product_counts.values())}")
        lines.append(f"Veg items: {veg_count}, Non-veg items: {non_veg_count}")
        lines.append(f"Approximate total spent: {total_spent:.2f}")

        lines.append("\nMost ordered products:")
        for name, count in sorted(product_counts.items(), key=lambda x: -x[1])[:10]:
            lines.append(f"  - {name}: {count}x")

        lines.append("\nCategory breakdown:")
        for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
            lines.append(f"  - {cat}: {count} items")

        return "\n".join(lines)

    def _prepare_products_summary(self, products: List[Dict[str, Any]]) -> str:
        """Prepare products list as a compact summary."""
        lines = []
        for p in products:
            tags_str = ", ".join(p.get('tags', [])[:3]) if p.get('tags') else "none"
            veg_label = "Veg" if p.get('is_veg', True) else "Non-Veg"
            lines.append(
                f"- ID: {p['id']} | {p['name']} | {p.get('category_name', 'Unknown')} | "
                f"{veg_label} | Price: {p.get('price', 0)} | Tags: {tags_str}"
            )
        return "\n".join(lines)

    def _get_default_preferences(self) -> Dict[str, Any]:
        """Return default preferences for new users."""
        return {
            "vegPreference": 0.5,
            "priceRange": "medium",
            "preferredCategories": [],
            "preferredTags": [],
            "insight": "New customer - showing popular items"
        }

    async def generate_communication_suggestions(
        self,
        profile: Dict[str, Any],
        order_history: List[Dict[str, Any]],
        preferences: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Generate communication suggestions for employees to interact with customers.
        Returns opening lines, conversation topics, and upsell suggestions.
        """
        if not self.client:
            self.initialize()

        customer_name = profile.get('name', 'Customer')
        first_name = customer_name.split()[0] if customer_name else 'there'
        total_points = profile.get('totalPoints', 0)

        # Analyze order history
        order_count = len(order_history) if order_history else 0

        # Build detailed context from order history
        favorite_items = []
        favorite_categories = []
        last_order_items = []
        days_since_last_visit = None

        if order_history:
            order_summary = self._prepare_communication_context(order_history)

            # Get favorite items
            product_counts = {}
            category_counts = {}
            for order in order_history:
                for item in order.get('items', []):
                    name = item.get('productName', '')
                    category = item.get('categoryName', '')
                    qty = item.get('quantity', 1)
                    if name:
                        product_counts[name] = product_counts.get(name, 0) + qty
                    if category:
                        category_counts[category] = category_counts.get(category, 0) + qty

            favorite_items = sorted(product_counts.items(), key=lambda x: -x[1])[:3]
            favorite_categories = sorted(category_counts.items(), key=lambda x: -x[1])[:2]

            # Get last order items
            if order_history:
                last_order_items = [item.get('productName', '') for item in order_history[0].get('items', [])[:3]]

            # Calculate days since last visit
            from datetime import datetime
            try:
                last_order_date = datetime.fromisoformat(order_history[0].get('createdAt', '').replace('Z', '+00:00'))
                days_since_last_visit = (datetime.now(last_order_date.tzinfo) - last_order_date).days
            except:
                pass
        else:
            order_summary = "First time customer - no previous orders"

        # Determine customer tier based on points
        customer_tier = "new"
        tier_description = "first-time visitor"
        if total_points >= 1000:
            customer_tier = "VIP"
            tier_description = f"VIP member with {total_points} points"
        elif total_points >= 500:
            customer_tier = "loyal"
            tier_description = f"loyal customer with {total_points} points"
        elif total_points >= 100:
            customer_tier = "regular"
            tier_description = f"returning customer with {total_points} points"
        elif order_count > 0:
            tier_description = f"customer who has ordered {order_count} times"

        veg_preference = preferences.get('vegPreference', 0.5) if preferences else 0.5
        dietary_info = "vegetarian" if veg_preference > 0.7 else "non-vegetarian" if veg_preference < 0.3 else "enjoys both veg and non-veg"

        # Build context strings
        favorite_items_str = ", ".join([f"{name} ({count}x)" for name, count in favorite_items]) if favorite_items else "None yet"
        favorite_categories_str = ", ".join([cat for cat, _ in favorite_categories]) if favorite_categories else "None yet"
        last_order_str = ", ".join(last_order_items) if last_order_items else "None"

        visit_context = ""
        if days_since_last_visit is not None:
            if days_since_last_visit == 0:
                visit_context = "They visited TODAY already - acknowledge they're back again!"
            elif days_since_last_visit == 1:
                visit_context = "They were here YESTERDAY - they're becoming a regular!"
            elif days_since_last_visit < 7:
                visit_context = f"Last visit was {days_since_last_visit} days ago - they're a frequent visitor"
            elif days_since_last_visit < 30:
                visit_context = f"Last visit was {days_since_last_visit} days ago - welcome them back warmly"
            else:
                visit_context = f"It's been {days_since_last_visit} days since their last visit - they might have missed this place!"

        prompt = f"""You are helping a restaurant employee create a WARM, PERSONALIZED interaction with a customer they're about to serve.

CUSTOMER DETAILS:
- Name: {customer_name} (use "{first_name}" in greetings)
- Status: {tier_description}
- Loyalty Points: {total_points}
- Total Orders: {order_count}
- Dietary Style: {dietary_info}

THEIR FAVORITES:
- Most ordered items: {favorite_items_str}
- Favorite categories: {favorite_categories_str}
- Last order included: {last_order_str}

VISIT CONTEXT:
{visit_context if visit_context else "New customer - make them feel welcome!"}

ORDER HISTORY DETAILS:
{order_summary}

CREATE HIGHLY PERSONALIZED SUGGESTIONS:

1. OPENING LINES (3 options) - Make these feel PERSONAL, not generic:
   - Reference their favorite items or last visit if returning customer
   - Acknowledge their loyalty status if they have points
   - Make first-time customers feel special and welcome
   - Use their first name naturally
   - Examples of GOOD personalized greetings:
     * "{first_name}! Back for your usual [favorite item]?"
     * "Hey {first_name}, so good to see you again! How was the [last ordered item]?"
     * "{first_name}, welcome to the family! First time here? Let me help you find something amazing."
     * "Look who's here! {first_name}, your {points} loyalty points are looking great!"

2. CONVERSATION TOPICS (2-3) - Specific talking points based on their history:
   - Ask about a specific item they frequently order
   - Mention if something new matches their preferences
   - Reference their usual order pattern

3. SPECIAL NOTES (1-3) - Important things to remember:
   - Dietary preferences
   - VIP/loyalty status
   - Any patterns from their orders

4. UPSELL SUGGESTIONS (2-3) - Products that match their taste:
   - Base recommendations on their actual order history
   - Include a personalized reason why THEY specifically would like it

Return ONLY a JSON object:
{{
    "openingLines": ["personalized greeting 1", "personalized greeting 2", "personalized greeting 3"],
    "conversationTopics": ["specific topic based on their history"],
    "specialNotes": ["important note about this customer"],
    "upsellSuggestions": [
        {{"productName": "product name", "reason": "personalized reason for them"}}
    ]
}}"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a warm, friendly assistant helping restaurant staff create genuine personal connections with customers. Generate suggestions that feel personal, not corporate or scripted. Use the customer's name and reference their actual preferences and history."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=1000
            )

            result_text = response.choices[0].message.content.strip()

            # Extract JSON from the response
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()

            return json.loads(result_text)

        except Exception as e:
            print(f"Error generating communication suggestions: {e}")
            # Return more personalized default suggestions
            default_greeting = f"Hey {first_name}!"
            if customer_tier == "VIP":
                default_greeting = f"{first_name}! Great to see our VIP member!"
            elif order_count > 5:
                default_greeting = f"{first_name}! Always a pleasure to see you!"
            elif order_count > 0:
                default_greeting = f"Welcome back, {first_name}!"
            else:
                default_greeting = f"Welcome {first_name}! First time here?"

            return {
                "openingLines": [
                    default_greeting,
                    f"Hi {first_name}, great to have you here!",
                    f"Hello {first_name}! What can I get started for you?"
                ],
                "conversationTopics": [f"You have {total_points} loyalty points - getting close to a reward!"] if total_points > 50 else [],
                "specialNotes": [f"{customer_tier.title()} customer with {total_points} points"] if customer_tier != "new" else ["New customer - make them feel welcome!"],
                "upsellSuggestions": []
            }

    def _prepare_communication_context(self, order_history: List[Dict[str, Any]]) -> str:
        """Prepare order history context for communication suggestions."""
        if not order_history:
            return "No previous orders"

        lines = []

        # Count products and categories
        product_counts = {}
        categories = set()
        veg_count = 0
        non_veg_count = 0

        for order in order_history[:10]:  # Limit to recent 10 orders
            for item in order.get('items', []):
                name = item.get('productName', 'Unknown')
                qty = item.get('quantity', 1)
                is_veg = item.get('isVeg', True)
                category = item.get('categoryName', '')

                product_counts[name] = product_counts.get(name, 0) + qty
                if category:
                    categories.add(category)
                if is_veg:
                    veg_count += qty
                else:
                    non_veg_count += qty

        lines.append(f"Recent orders: {len(order_history[:10])}")
        lines.append(f"Veg/Non-veg ratio: {veg_count}/{non_veg_count}")
        lines.append(f"Favorite categories: {', '.join(list(categories)[:3])}")

        if product_counts:
            lines.append("Most ordered items:")
            for name, count in sorted(product_counts.items(), key=lambda x: -x[1])[:5]:
                lines.append(f"  - {name}: {count}x")

        return "\n".join(lines)

    async def chat_completion(
        self,
        message: str,
        conversation_history: List[Dict[str, str]],
        products_context: str,
        user_preferences: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Handle conversational chat for food ordering with product suggestions.
        Returns structured response with message, product IDs, and follow-up prompts.
        """
        if not self.client:
            self.initialize()

        # Build user preference context
        preference_context = ""
        if user_preferences:
            veg_pref = user_preferences.get('vegPreference', 0.5)
            if veg_pref > 0.7:
                pref_desc = "strongly prefers VEGETARIAN food"
            elif veg_pref < 0.3:
                pref_desc = "enjoys NON-VEG dishes"
            else:
                pref_desc = "enjoys both veg and non-veg"

            preference_context = f"""
=== THIS CUSTOMER'S PROFILE ===
🍽️ Dietary: {pref_desc}
💰 Budget: {user_preferences.get('priceRange', 'medium')} price range
❤️ Favorite Categories: {', '.join(user_preferences.get('preferredCategories', [])[:3]) or 'exploring'}
🏷️ Loves: {', '.join(user_preferences.get('preferredTags', [])[:5]) or 'variety'}
💡 Insight: {user_preferences.get('insight', 'New customer')}

Use this info to personalize your recommendations!"""
        else:
            preference_context = """
=== GUEST USER ===
No order history - suggest popular items and ask about preferences!"""

        system_prompt = f"""You are "Barista AI", a friendly and knowledgeable food ordering assistant. You have deep knowledge of our menu and genuinely care about helping customers find perfect dishes.

{products_context}

{preference_context}

YOUR PERSONALITY:
- Warm, enthusiastic, and conversational (like a helpful friend who loves food)
- Give VARIED responses - never repeat the same phrase twice
- Show genuine excitement about dishes you recommend
- Remember context from the conversation

UNDERSTANDING USER INTENT:
- If user says "Option 1", "Option 2", "first one", "second", "yes", "sounds good" → They're CONFIRMING a previous suggestion. Respond with enthusiasm like "Excellent choice! The [dish name] is absolutely delicious - you'll love it!"
- If user asks about calories, price, ingredients → Provide the specific info from the menu data
- If user says "something spicy/light/quick" → Recommend matching dishes with WHY they match
- If user seems undecided → Suggest browsing categories or ask about their mood

RESPONSE VARIETY (use different phrasings):
- "You might love our [dish]!" / "I'd highly recommend [dish]!" / "Perfect for you: [dish]!"
- "Great choice!" / "Excellent pick!" / "You've got great taste!"
- Mention specific details: "The [dish] has [feature] and takes only [time] minutes!"

CATEGORIES TO SUGGEST:
- North Indian: Chole Bhature, Butter Khicdi
- South Indian: Masala Dosa, Ghee Podi Masala Dosa, Lemon Rice
- Fast Food: Pizza, French Fries, White Sauce Pasta
- Non-Veg: Handi Chicken

FOLLOW-UP PROMPTS (make them contextual and helpful):
- After recommendation: "Add these to cart?", "Tell me more about [dish]", "Something different?"
- After confirmation: "Anything else?", "Add a drink?", "Ready to order?"
- For exploration: "Show me [category]", "What's on discount?", "Chef's special?"

CRITICAL: Respond with ONLY valid JSON:
{{
    "message": "Your personalized, varied response mentioning dish NAMES",
    "suggested_product_ids": ["uuid-from-menu"],
    "intent": "greeting|recommendation|confirmation|clarification|farewell",
    "follow_up_prompts": ["Contextual option 1", "Contextual option 2", "Contextual option 3"]
}}"""

        # Build messages array
        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history (last 6 messages for context)
        for msg in conversation_history[-6:]:
            messages.append({
                "role": msg.get('role', 'user'),
                "content": msg.get('content', '')
            })

        # Add current user message
        messages.append({"role": "user", "content": message})

        try:
            print("   📡 Sending to OpenAI API...")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=500,
                response_format={"type": "json_object"}  # Force JSON output
            )

            result_text = response.choices[0].message.content
            print(f"   📥 RAW OPENAI RESPONSE: {result_text}")

            if not result_text:
                raise ValueError("Empty response from OpenAI")

            result_text = result_text.strip()

            result = json.loads(result_text)
            print(f"   ✅ PARSED JSON: message='{result.get('message', '')[:100]}...', ids={result.get('suggested_product_ids', [])}")

            return {
                'message': result.get('message', "I'd be happy to help you find something delicious!"),
                'suggested_product_ids': result.get('suggested_product_ids', []),
                'intent': result.get('intent', 'recommendation'),
                'follow_up_prompts': result.get('follow_up_prompts', [
                    "Something spicy",
                    "Vegetarian options",
                    "Popular items"
                ])
            }

        except json.JSONDecodeError as e:
            print(f"   ❌ JSON PARSING ERROR: {e}")
            print(f"   ❌ RAW RESPONSE WAS: {result_text if 'result_text' in locals() else 'N/A'}")
            print("   ⚠️ RETURNING FALLBACK RESPONSE")
            return self._get_fallback_chat_response()
        except Exception as e:
            print(f"   ❌ ERROR IN CHAT COMPLETION: {e}")
            print("   ⚠️ RETURNING FALLBACK RESPONSE")
            return self._get_fallback_chat_response()

    def _get_fallback_chat_response(self) -> Dict[str, Any]:
        """Return fallback response when chat completion fails."""
        return {
            'message': "I'd love to help you find something delicious! What are you in the mood for?",
            'suggested_product_ids': [],
            'intent': 'clarification',
            'follow_up_prompts': [
                "Something spicy",
                "Vegetarian options",
                "Quick bites",
                "Show me popular items"
            ]
        }


# Singleton instance
openai_service = OpenAIService()
