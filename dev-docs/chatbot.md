# Chatbot API Documentation

The AI-powered food ordering chatbot uses OpenAI GPT to provide personalized food recommendations through natural conversation.

**Base URL:** `http://localhost:8000` (Python Backend)

---

## Overview

The chatbot system consists of:
- **Chat Router** (`/chat`) - FastAPI endpoints for chat interactions
- **Chat Service** - Orchestrates conversations with product recommendations
- **OpenAI Service** - Handles GPT interactions for natural language processing
- **Frontend Store** - Zustand store for managing chat state

---

## Endpoints

### 1. Send Message

Process a chat message and get AI response with product suggestions.

```
POST /chat/message
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "I'm craving something spicy",
  "profile_id": "uuid-of-logged-in-user",  // Optional - for personalization
  "conversation_history": [                 // Optional - previous messages
    {
      "role": "user",
      "content": "Hi"
    },
    {
      "role": "assistant",
      "content": "Hello! What are you in the mood for today?"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "For spicy cravings, I'd highly recommend our Spicy Paneer Tikka! It has the perfect kick. You might also love the Schezwan Noodles - they're a customer favorite!",
    "suggested_products": [
      {
        "id": "uuid-1",
        "name": "Spicy Paneer Tikka",
        "slug": "spicy-paneer-tikka",
        "description": "Cottage cheese marinated in spicy sauce",
        "price": 249,
        "discounted_price": 199,
        "effective_price": 199,
        "is_veg": true,
        "image_url": "https://...",
        "thumbnail_url": "https://...",
        "category_id": "uuid",
        "category_name": "Starters",
        "category_slug": "starters",
        "has_active_discount": true,
        "discount_percent": 20,
        "royalty_points": 50,
        "preparation_time": 15,
        "calories": 350,
        "is_available": true,
        "is_featured": true,
        "tags": ["spicy", "bestseller"]
      }
    ],
    "intent": "recommendation",
    "follow_up_prompts": [
      "Add these to cart?",
      "Tell me more about Paneer Tikka",
      "Something different?"
    ]
  }
}
```

**Intent Types:**
| Intent | Description |
|--------|-------------|
| `greeting` | User greeting/hello |
| `recommendation` | AI suggesting products |
| `confirmation` | User confirming a suggestion |
| `clarification` | AI asking for more details |
| `farewell` | User ending conversation |

---

### 2. Confirm Cart

Get full product data for products to add to cart.

```
POST /chat/confirm
Content-Type: application/json
```

**Request Body:**
```json
{
  "product_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid-1",
        "name": "Spicy Paneer Tikka",
        "slug": "spicy-paneer-tikka",
        "price": 249,
        "discounted_price": 199,
        "effective_price": 199,
        "is_veg": true,
        "image_url": "https://...",
        "category_name": "Starters",
        "has_active_discount": true,
        "discount_percent": 20,
        "royalty_points": 50
        // ... full product data
      }
    ]
  }
}
```

---

## AI Behavior

### Personalization

When `profile_id` is provided, the chatbot:
1. Fetches user's order history from database
2. Analyzes patterns using OpenAI to determine:
   - Veg preference (0.0 = non-veg lover, 1.0 = vegetarian)
   - Price range preference (low/medium/high)
   - Favorite categories
   - Preferred tags
3. Uses this context to personalize recommendations

### Conversation Context

The chatbot maintains conversation context by:
- Accepting up to 6 previous messages in `conversation_history`
- Understanding contextual responses like "Option 1", "Yes", "The first one"
- Remembering what was previously suggested

### Product Context

The AI has access to:
- Complete menu with all available products
- Product details: name, price, category, tags, veg/non-veg, calories, prep time
- Current discounts and featured items
- Categories and their items

---

## Frontend Integration

### Chat Store (Zustand)

```typescript
import { useChatStore } from '@/stores/chatStore';

// State
const {
  messages,        // ChatMessage[]
  isLoading,       // boolean
  isOpen,          // boolean
  error            // string | null
} = useChatStore();

// Actions
const {
  addUserMessage,      // (content: string) => messageId
  addAssistantMessage, // (content, products?, prompts?) => void
  setLoading,          // (loading: boolean) => void
  setError,            // (error: string | null) => void
  clearChat,           // () => void
  setOpen,             // (open: boolean) => void
  toggleOpen           // () => void
} = useChatStore();
```

### ChatMessage Type

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestedProducts: ChatProduct[];
  followUpPrompts: string[];
  timestamp: string;
}
```

### ChatProduct Type

```typescript
interface ChatProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discounted_price: number | null;
  effective_price: number;
  is_veg: boolean;
  image_url: string | null;
  thumbnail_url: string | null;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  has_active_discount: boolean;
  discount_percent: number;
  royalty_points: number;
  preparation_time: number | null;
  calories: number | null;
  is_available: boolean;
  is_featured: boolean;
  tags: string[];
}
```

---

## Example Conversations

### Guest User
```
User: "Hi"
AI: "Hello! Welcome to Barista! What are you in the mood for today?
     We have amazing North Indian, South Indian, and Fast Food options!"

User: "Something vegetarian and quick"
AI: "Perfect! For a quick veggie fix, I'd recommend:
     1. Masala Dosa (15 mins) - crispy and flavorful
     2. French Fries (5 mins) - classic and satisfying
     3. Paneer Roll (10 mins) - filling and delicious!"
     [Shows product cards]

User: "Option 1"
AI: "Excellent choice! The Masala Dosa is one of our bestsellers.
     Would you like to add it to your cart?"
```

### Logged-in User (Personalized)
```
User: "What should I order today?"
AI: "Based on your love for spicy food and North Indian cuisine,
     I'd suggest trying our Chole Bhature today! You've ordered
     it 3 times before and it's freshly made. We also have a new
     Butter Khichdi that matches your taste!"
     [Shows personalized recommendations]
```

---

## Error Handling

When OpenAI fails or returns invalid response, the chatbot returns a fallback:

```json
{
  "success": true,
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
```

---

## Configuration

### Environment Variables

```env
# Python Backend (.env)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo  # or gpt-4
```

### OpenAI Settings

| Setting | Value | Description |
|---------|-------|-------------|
| Model | gpt-3.5-turbo | Fast and cost-effective |
| Temperature | 0.7 | Balanced creativity |
| Max Tokens | 500 | Response length limit |
| Response Format | JSON | Structured output |

---

## Architecture Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │  Python Backend │     │    OpenAI       │
│   (Next.js)     │     │   (FastAPI)     │     │    (GPT)        │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  POST /chat/message   │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │                       │  Fetch products       │
         │                       │  from PostgreSQL      │
         │                       │                       │
         │                       │  Fetch user prefs     │
         │                       │  (if profile_id)      │
         │                       │                       │
         │                       │  chat.completions     │
         │                       │──────────────────────>│
         │                       │                       │
         │                       │  JSON response        │
         │                       │<──────────────────────│
         │                       │                       │
         │  Response with        │                       │
         │  products & prompts   │                       │
         │<──────────────────────│                       │
         │                       │                       │
```

---

## Related Files

| File | Description |
|------|-------------|
| `python_backend/app/routers/chat.py` | API endpoints |
| `python_backend/app/services/chat_service.py` | Chat orchestration |
| `python_backend/app/services/openai_service.py` | OpenAI integration |
| `web_frontend/src/stores/chatStore.ts` | Frontend state management |
