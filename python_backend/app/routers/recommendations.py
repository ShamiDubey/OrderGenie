"""
Recommendations API router.
Provides endpoints for AI-powered food recommendations.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.services.recommendation_service import recommendation_service
from app.services.openai_service import openai_service


class OrderItem(BaseModel):
    productName: str
    quantity: int
    isVeg: bool
    categoryName: Optional[str] = None


class OrderHistory(BaseModel):
    id: str
    orderNumber: str
    grandTotal: str
    createdAt: str
    items: List[OrderItem]


class ProfileData(BaseModel):
    id: str
    name: str
    email: str
    totalPoints: int


class CommunicationRequest(BaseModel):
    profile: ProfileData
    order_history: List[OrderHistory]
    preferences: Optional[Dict[str, Any]] = None

router = APIRouter()


@router.post("/analyze/{profile_id}")
async def analyze_preferences(profile_id: str):
    """
    Analyze a user's order history and compute their preferences.
    Returns computed preference scores, personalized insights, and metadata.
    """
    try:
        preferences = await recommendation_service.compute_preferences(profile_id)
        return {
            "success": True,
            "data": {
                "vegPreference": preferences.get("vegPreference"),
                "priceRange": preferences.get("priceRange"),
                "avgOrderValue": preferences.get("avgOrderValue"),
                "categoryAffinities": preferences.get("categoryAffinities"),
                "tagAffinities": preferences.get("tagAffinities"),
                "favoriteProducts": preferences.get("favoriteProducts"),
                "preferredCategories": preferences.get("preferredCategories"),
                "preferredTags": preferences.get("preferredTags"),
                "totalOrders": preferences.get("totalOrders"),
                "insight": preferences.get("insight"),
                "insightMetadata": preferences.get("insightMetadata", {}),
                "source": preferences.get("source")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate/{profile_id}")
async def generate_recommendations(
    profile_id: str,
    limit: int = Query(default=10, ge=1, le=50)
):
    """
    Generate personalized product recommendations for a user.
    Returns products with AI-generated reasons for recommendation.
    """
    try:
        result = await recommendation_service.get_personalized_recommendations(
            profile_id, limit
        )
        return {
            "success": result.get("success", True),
            "data": {
                "recommendations": result.get("recommendations", []),
                "insights": result.get("insights", ""),
                "preferences": result.get("preferences", {}),
                "source": result.get("source", "unknown")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trending")
async def get_trending(
    limit: int = Query(default=10, ge=1, le=50)
):
    """
    Get globally trending products.
    Used for guests or users with no order history.
    """
    try:
        result = await recommendation_service.get_trending_products(limit)
        return {
            "success": result.get("success", True),
            "data": {
                "products": result.get("products", []),
                "source": result.get("source", "trending")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/similar/{product_id}")
async def get_similar_products(
    product_id: str,
    limit: int = Query(default=5, ge=1, le=20)
):
    """
    Get products similar to a given product.
    Used for "You might also like" sections.
    """
    try:
        result = await recommendation_service.get_similar_products(product_id, limit)
        return {
            "success": result.get("success", True),
            "data": {
                "products": result.get("products", []),
                "source": result.get("source", "similar")
            },
            "error": result.get("error")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/communication/{profile_id}")
async def get_communication_suggestions(
    profile_id: str,
    request: CommunicationRequest
):
    """
    Generate AI-powered communication suggestions for employees.
    Returns opening lines, conversation topics, and upsell suggestions.
    """
    try:
        # Convert pydantic models to dicts
        profile_dict = request.profile.model_dump()
        order_history_dict = [order.model_dump() for order in request.order_history]
        preferences_dict = request.preferences

        result = await openai_service.generate_communication_suggestions(
            profile=profile_dict,
            order_history=order_history_dict,
            preferences=preferences_dict
        )

        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        print(f"Error in communication suggestions: {e}")
        # Return default suggestions on error
        return {
            "success": True,
            "data": {
                "openingLines": [
                    f"Welcome, {request.profile.name}!",
                    f"Great to see you, {request.profile.name}!",
                    f"Hello {request.profile.name}, how can I help you today?"
                ],
                "conversationTopics": [],
                "specialNotes": [],
                "upsellSuggestions": []
            }
        }
