"""
Database service for recommendation system.
Provides async access to PostgreSQL for reading order history and products.
"""

import asyncpg
from typing import List, Dict, Any, Optional
from app.config import settings


class DatabaseService:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.database_url = settings.DATABASE_URL

    async def initialize(self):
        """Initialize the database connection pool."""
        if not self.database_url:
            raise ValueError("DATABASE_URL is not configured")

        self.pool = await asyncpg.create_pool(
            self.database_url,
            min_size=2,
            max_size=10
        )

    async def close(self):
        """Close the database connection pool."""
        if self.pool:
            await self.pool.close()

    async def get_order_history(self, profile_id: str) -> List[Dict[str, Any]]:
        """
        Fetch order history with items for a profile.
        Returns orders with their items for preference computation.
        """
        if not self.pool:
            raise RuntimeError("Database not initialized")

        query = """
            SELECT
                o.id as order_id,
                o.order_number,
                o.grand_total,
                o.created_at as order_date,
                oi.product_id,
                oi.product_name,
                oi.product_slug,
                oi.quantity,
                oi.effective_price,
                oi.line_total,
                oi.is_veg,
                oi.category_name
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.profile_id = $1
            ORDER BY o.created_at DESC
        """

        rows = await self.pool.fetch(query, profile_id)
        return [dict(row) for row in rows]

    async def get_all_products(self) -> List[Dict[str, Any]]:
        """
        Fetch all available products with categories.
        Returns products that can be recommended.
        """
        if not self.pool:
            raise RuntimeError("Database not initialized")

        query = """
            SELECT
                p.id,
                p.name,
                p.slug,
                p.description,
                p.price,
                p.discounted_price,
                p.discount_ends,
                p.is_veg,
                p.tags,
                p.image_url,
                p.thumbnail_url,
                p.category_id,
                c.name as category_name,
                c.slug as category_slug,
                p.is_available,
                p.is_featured,
                p.preparation_time,
                p.calories,
                p.serving_size
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_available = true
            ORDER BY p.display_order, p.name
        """

        rows = await self.pool.fetch(query)
        return [dict(row) for row in rows]

    async def get_product_by_id(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a single product by ID."""
        if not self.pool:
            raise RuntimeError("Database not initialized")

        query = """
            SELECT
                p.id,
                p.name,
                p.slug,
                p.description,
                p.price,
                p.discounted_price,
                p.discount_ends,
                p.is_veg,
                p.tags,
                p.image_url,
                p.thumbnail_url,
                p.category_id,
                c.name as category_name,
                c.slug as category_slug,
                p.is_available,
                p.is_featured,
                p.preparation_time,
                p.calories,
                p.serving_size
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = $1
        """

        row = await self.pool.fetchrow(query, product_id)
        return dict(row) if row else None

    async def get_trending_products(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get globally trending products based on order frequency.
        Returns products ordered by total quantity sold.
        """
        if not self.pool:
            raise RuntimeError("Database not initialized")

        query = """
            SELECT
                p.id,
                p.name,
                p.slug,
                p.description,
                p.price,
                p.discounted_price,
                p.discount_ends,
                p.is_veg,
                p.tags,
                p.image_url,
                p.thumbnail_url,
                p.category_id,
                c.name as category_name,
                c.slug as category_slug,
                p.is_available,
                p.is_featured,
                p.preparation_time,
                p.calories,
                p.serving_size,
                COALESCE(SUM(oi.quantity), 0) as total_ordered,
                COUNT(DISTINCT oi.order_id) as order_count
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN order_items oi ON p.id = oi.product_id
            WHERE p.is_available = true
            GROUP BY p.id, c.name, c.slug
            ORDER BY total_ordered DESC, p.display_order
            LIMIT $1
        """

        rows = await self.pool.fetch(query, limit)
        return [dict(row) for row in rows]

    async def get_categories(self) -> List[Dict[str, Any]]:
        """Get all active categories."""
        if not self.pool:
            raise RuntimeError("Database not initialized")

        query = """
            SELECT id, name, slug, description
            FROM categories
            WHERE is_active = true
            ORDER BY display_order
        """

        rows = await self.pool.fetch(query)
        return [dict(row) for row in rows]

    async def get_profile_by_id(self, profile_id: str) -> Optional[Dict[str, Any]]:
        """Get profile info by ID."""
        if not self.pool:
            raise RuntimeError("Database not initialized")

        query = """
            SELECT id, name, email, total_points, created_at
            FROM face_profiles
            WHERE id = $1
        """

        row = await self.pool.fetchrow(query, profile_id)
        return dict(row) if row else None


# Singleton instance
db_service = DatabaseService()
