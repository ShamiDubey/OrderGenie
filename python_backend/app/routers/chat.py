"""
Chat API router.
Provides endpoints for AI-powered food ordering chatbot.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from app.services.chat_service import chat_service


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatMessageRequest(BaseModel):
    message: str
    profile_id: Optional[str] = None
    conversation_history: List[ChatMessage] = []


class ConfirmCartRequest(BaseModel):
    product_ids: List[str]


router = APIRouter()


@router.post("/message")
async def send_message(request: ChatMessageRequest):
    """
    Process a chat message and return AI response with product suggestions.
    """
    try:
        # Convert conversation history to dicts
        history = [msg.model_dump() for msg in request.conversation_history]

        result = await chat_service.process_message(
            message=request.message,
            profile_id=request.profile_id,
            conversation_history=history
        )

        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        print(f"Error in chat message: {e}")
        return {
            "success": True,
            "data": {
                "message": "I'd love to help you find something delicious! What are you in the mood for?",
                "suggested_products": [],
                "intent": "clarification",
                "follow_up_prompts": [
                    "Something spicy",
                    "Vegetarian options",
                    "Quick bites",
                    "Popular items"
                ]
            }
        }


@router.post("/confirm")
async def confirm_cart(request: ConfirmCartRequest):
    """
    Get full product data for confirmed products to add to cart.
    """
    try:
        products = await chat_service.get_products_for_cart(request.product_ids)

        return {
            "success": True,
            "data": {
                "products": products
            }
        }
    except Exception as e:
        print(f"Error confirming cart: {e}")
        raise HTTPException(status_code=500, detail=str(e))
