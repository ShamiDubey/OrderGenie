"use client";

import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { ChatWindow } from "./ChatWindow";

interface ChatWidgetProps {
  profileId?: string;
  userAvatarUrl?: string | null;
}

export function ChatWidget({ profileId, userAvatarUrl }: ChatWidgetProps) {
  const { isOpen, toggleOpen, clearChat } = useChatStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Clear chat when widget is closed
  const handleToggle = () => {
    if (isOpen) {
      clearChat();
    }
    toggleOpen();
  };

  if (!mounted) return null;

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 sm:bottom-24 sm:right-6">
          <ChatWindow
            profileId={profileId}
            userAvatarUrl={userAvatarUrl}
            onClose={handleToggle}
          />
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={handleToggle}
        className="fixed bottom-4 right-4 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6 sm:h-16 sm:w-16"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        ) : (
          <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
        )}
      </button>
    </>
  );
}
