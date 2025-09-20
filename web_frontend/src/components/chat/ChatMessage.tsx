'use client';

import Image from 'next/image';
import { ChatMessage as ChatMessageType, ChatProduct } from '@/stores/chatStore';
import { ChatProductCard } from './ChatProductCard';
import { ShoppingCart, Sparkles, User } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
  userAvatarUrl?: string | null;
  selectedProducts: Set<string>;
  onProductSelect: (productId: string) => void;
  onAddToCart: (products: ChatProduct[]) => void;
}

export function ChatMessage({
  message,
  userAvatarUrl,
  selectedProducts,
  onProductSelect,
  onAddToCart,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const hasProducts = message.suggestedProducts.length > 0;
  const selectedCount = message.suggestedProducts.filter((p) =>
    selectedProducts.has(p.id)
  ).length;

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full ${
          isUser ? 'bg-gray-200' : 'bg-primary/10'
        }`}
      >
        {isUser ? (
          userAvatarUrl ? (
            <Image
              src={userAvatarUrl}
              alt="You"
              fill
              className="object-cover"
            />
          ) : (
            <User className="h-4 w-4 text-gray-600" />
          )
        ) : (
          <Sparkles className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Content */}
      <div className={`flex max-w-[80%] flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Message Bubble */}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isUser
              ? 'rounded-br-md bg-primary text-white'
              : 'rounded-bl-md bg-gray-100 text-gray-800'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Product Cards */}
        {hasProducts && (
          <div className="w-full space-y-2">
            {message.suggestedProducts.map((product) => (
              <ChatProductCard
                key={product.id}
                product={product}
                isSelected={selectedProducts.has(product.id)}
                onSelect={() => onProductSelect(product.id)}
              />
            ))}

            {/* Add to Cart Button */}
            {selectedCount > 0 && (
              <button
                onClick={() => onAddToCart(message.suggestedProducts)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                <ShoppingCart className="h-4 w-4" />
                Add {selectedCount} item{selectedCount > 1 ? 's' : ''} to Cart
              </button>
            )}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}
