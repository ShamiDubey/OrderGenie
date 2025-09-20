"use client";

import { useRef, useEffect, useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { useChatStore, ChatProduct } from "@/stores/chatStore";
import { useCartStore } from "@/stores/cartStore";
import { sendChatMessage } from "@/lib/api";
import { chatProductToNormalizedProduct } from "@/lib/normalizers";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickReplies } from "./QuickReplies";

interface ChatWindowProps {
  profileId?: string;
  userAvatarUrl?: string | null;
  onClose: () => void;
}

export function ChatWindow({
  profileId,
  userAvatarUrl,
  onClose,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    isLoading,
    error,
    addUserMessage,
    addAssistantMessage,
    setLoading,
    setError,
  } = useChatStore();
  const { addItem } = useCartStore();
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set()
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    addUserMessage(message);
    setLoading(true);
    setError(null);
    setSelectedProducts(new Set());

    try {
      // Build conversation history for context
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await sendChatMessage({
        message,
        profile_id: profileId,
        conversation_history: history,
      });

      if (response.success && response.data) {
        addAssistantMessage(
          response.data.message,
          response.data.suggested_products || [],
          response.data.follow_up_prompts || []
        );
      } else {
        throw new Error("Failed to get response");
      }
    } catch (err) {
      console.error("Chat error:", err);
      setError("Something went wrong. Please try again.");
      addAssistantMessage(
        "I'm having trouble connecting right now. Please try again in a moment.",
        [],
        ["Try again", "Show popular items"]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleAddToCart = (products: ChatProduct[]) => {
    const productsToAdd = products.filter((p) => selectedProducts.has(p.id));

    productsToAdd.forEach((product) => {
      const normalizedProduct = chatProductToNormalizedProduct(product);
      addItem(normalizedProduct, 1);
    });

    setSelectedProducts(new Set());

    // Add confirmation message
    addAssistantMessage(
      `Added ${productsToAdd.length} item${
        productsToAdd.length > 1 ? "s" : ""
      } to your cart! Anything else I can help you with?`,
      [],
      ["View cart", "Show more options", "That's all, thanks!"]
    );
  };

  // Get latest message's follow-up prompts
  const latestMessage = messages[messages.length - 1];
  const showQuickReplies =
    !isLoading &&
    latestMessage?.role === "assistant" &&
    latestMessage.followUpPrompts.length > 0;

  // Get products from latest assistant message for add to cart
  const latestProducts =
    latestMessage?.role === "assistant" ? latestMessage.suggestedProducts : [];

  return (
    <div className="flex h-[500px] w-[350px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[550px] sm:w-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          {/* <Sparkles className="h-5 w-5" /> */}
          <div>
            <h3 className="font-semibold">Barista AI</h3>
            <p className="text-xs opacity-80">Your food assistant</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 transition-colors hover:bg-white/20"
          aria-label="Close chat"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Sparkles className="mb-3 h-12 w-12 text-primary/30" />
            <h4 className="mb-1 font-medium text-gray-800">
              Hi! I'm Barista AI
            </h4>
            <p className="mb-4 text-sm text-gray-500">
              Tell me what you're in the mood for, and I'll suggest the perfect
              dishes for you!
            </p>
            <QuickReplies
              prompts={[
                "What's popular today?",
                "I'm feeling hungry",
                "Something light",
                "Surprise me!",
              ]}
              onSelect={handleSendMessage}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                userAvatarUrl={userAvatarUrl}
                selectedProducts={selectedProducts}
                onProductSelect={handleProductSelect}
                onAddToCart={handleAddToCart}
              />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Quick Replies */}
      {showQuickReplies && (
        <div className="border-t border-gray-100 px-4 py-2">
          <QuickReplies
            prompts={latestMessage.followUpPrompts}
            onSelect={handleSendMessage}
          />
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={handleSendMessage} disabled={isLoading} />
    </div>
  );
}
