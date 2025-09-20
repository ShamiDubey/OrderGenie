import { create } from 'zustand';

export interface ChatProduct {
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestedProducts: ChatProduct[];
  followUpPrompts: string[];
  timestamp: string;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isOpen: boolean;
  error: string | null;

  // Actions
  addUserMessage: (content: string) => string;
  addAssistantMessage: (
    content: string,
    suggestedProducts?: ChatProduct[],
    followUpPrompts?: string[]
  ) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearChat: () => void;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  isOpen: false,
  error: null,

  addUserMessage: (content: string) => {
    const id = crypto.randomUUID();
    const message: ChatMessage = {
      id,
      role: 'user',
      content,
      suggestedProducts: [],
      followUpPrompts: [],
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, message],
      error: null,
    }));

    return id;
  },

  addAssistantMessage: (
    content: string,
    suggestedProducts: ChatProduct[] = [],
    followUpPrompts: string[] = []
  ) => {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      suggestedProducts,
      followUpPrompts,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setError: (error: string | null) => set({ error }),

  clearChat: () =>
    set({
      messages: [],
      error: null,
    }),

  setOpen: (open: boolean) => set({ isOpen: open }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
}));
